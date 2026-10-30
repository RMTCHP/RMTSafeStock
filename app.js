const app = (() => {
  let token = '', products = [], employees = [], users = [], tab = 'employees', selectedEmployee = '';
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const alert = options => Swal.fire({confirmButtonColor:'#0f766e',cancelButtonColor:'#64748b',showCloseButton:true,...options});
  const loading = title => Swal.fire({title,allowOutsideClick:false,allowEscapeKey:false,showCloseButton:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});
  const confirm = async (title,text) => (await alert({icon:'question',title,text,showCancelButton:true,confirmButtonText:'ยืนยัน',cancelButtonText:'ยกเลิก'})).isConfirmed;
  const error = e => alert({icon:'error',title:'ไม่สามารถทำรายการได้',text:e.message === 'SESSION_EXPIRED' ? 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่' : e.message});
  async function api(action, data={}) {
    if (!window.RMT_API_URL || window.RMT_API_URL.includes('PASTE_')) throw Error('กรุณาตั้งค่า URL ใน config.js');
    const response = await fetch(window.RMT_API_URL,{method:'POST',body:new URLSearchParams({action,data:JSON.stringify(data)})});
    if (!response.ok) throw Error('เชื่อมต่อระบบไม่สำเร็จ ('+response.status+')');
    const result=await response.json(); if(!result.ok) throw Error(result.error || 'เกิดข้อผิดพลาด'); return result.data;
  }
  const write=(action,data)=>api('write',{writeAction:action,payload:{token,...data}});
  async function refresh(){[products,employees]=await Promise.all([api('products',{token}),api('employees',{token})]);}
  async function run(title, fn, success) { try { loading(title); const result=await fn(); Swal.close(); if(success) await alert({icon:'success',title:success}); return result; } catch(e){Swal.close();await error(e);return null;} }
  function options(){return '<option value="">เลือกสินค้า</option>'+products.map(p=>`<option value="${esc(p.productId)}">${esc(p.name)} (${p.stockQty} ${esc(p.unit)})</option>`).join('');}
  function field(id,label,type='text',value=''){return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="1"':''}></div>`;}
  function qty(value){const n=Number(value);return Number.isInteger(n)&&n>0;}
  async function login(){const button=$('loginSubmit');if(button.disabled)return;const username=$('username').value.trim(),password=$('password').value;if(!username||!password)return alert({icon:'warning',title:'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'});button.disabled=true;try{if(!await confirm('เข้าสู่ระบบ','เข้าสู่ระบบด้วย '+username+'?'))return;button.classList.add('is-loading');button.setAttribute('aria-busy','true');button.querySelector('.login-label').textContent='กำลังเข้าสู่ระบบ';await run('กำลังเข้าสู่ระบบ',async()=>{const r=await api('login',{username,password});token=r.token;$('who').textContent=r.user.displayName;await refresh();$('login').hidden=true;$('app').hidden=false;await render('dash');},'เข้าสู่ระบบสำเร็จ');}finally{button.disabled=false;button.classList.remove('is-loading');button.removeAttribute('aria-busy');button.querySelector('.login-label').textContent='เข้าสู่ระบบ';}}
  function togglePassword(){const input=$('password'),button=document.querySelector('.password-toggle'),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'ซ่อน':'แสดง';button.setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');button.setAttribute('aria-pressed',String(show));}
  async function logout(){if(!await confirm('ออกจากระบบ','ต้องการออกจากระบบใช่หรือไม่'))return;await run('กำลังออกจากระบบ',async()=>{await write('logout',{});token='';$('app').hidden=true;$('login').hidden=false;$('password').value='';},'ออกจากระบบแล้ว');}
  async function page(name){if(name==='settings')tab='users';await run('กำลังโหลดข้อมูล',()=>render(name));}
  async function render(name){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const title=({dash:'Dashboard',issue:'เบิกอุปกรณ์',receive:'รับสินค้าเข้า',settings:'ตั้งค่า'})[name]||'ตั้งค่า';$('pageTitle').textContent=title;$('pageBreadcrumb').textContent=title;if(name==='dash')return dashboard();if(name==='issue')return issueView();if(name==='receive')return receiveView();await refresh();if(tab==='users')users=await api('users',{token});return settings();}
  async function dashboard(){
    const d=await api('dashboard',{token});
    const icon=(path)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    const icons=[
      icon('<path d="m12 3 9 5v8l-9 5-9-5V8z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
      icon('<path d="M12 3 2 20h20L12 3z"/><path d="M12 9v4m0 3h.01"/>'),
      icon('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6m0-6-6 6"/>'),
      icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-9 3v5m-2-2 2 2 2-2"/>'),
      icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-2 5h6"/>')
    ];
    const metrics=[['รายการสินค้าทั้งหมด',d.products,'รายการ'],['สินค้าถึงจุดสั่งซื้อ',d.lowCount,'รวมสินค้าที่หมด'],['สินค้าหมด',d.zeroCount,'รายการ'],['เบิกวันนี้',d.issuesToday ?? '—','รายการเบิก'],['เบิกเดือนนี้',d.issuesMonth ?? '—','รายการเบิก']];
    $('view').innerHTML=`<section class="dashboard">
      <div class="dash-heading"><div><span class="dash-eyebrow">SAFETY INVENTORY</span><h2>ภาพรวมสต็อก</h2><p>ติดตามอุปกรณ์ Safety และรายการเคลื่อนไหว</p></div><button class="secondary dash-refresh" onclick="app.page('dash')">↻ รีเฟรช</button></div>
      <div class="dash-kpis">${metrics.map((m,i)=>`<div class="dash-kpi dash-kpi-${i}"><div class="dash-kpi-top"><span>${m[0]}</span><span class="dash-icon">${icons[i]}</span></div><div class="dash-value">${m[1]}</div><small>${m[2]}</small></div>`).join('')}</div>
      <section class="dash-quick"><div class="dash-section-label">การทำรายการ <span>QUICK ACTIONS</span></div><div class="dash-actions"><button onclick="app.page('issue')"><span class="action-icon">↗</span><span><strong>เบิกอุปกรณ์</strong><small>Issue PPE</small></span><span class="action-arrow">→</span></button><button class="secondary" onclick="app.page('receive')"><span class="action-icon">↓</span><span><strong>รับสินค้าเข้า</strong><small>Stock Receiving</small></span><span class="action-arrow">→</span></button></div></section>
      ${!d.products?'<div class="dash-onboard"><div><strong>เริ่มต้นใช้งาน SafeStock</strong><p>เพิ่มสินค้าและพนักงานใน Settings เพื่อเริ่มทำรายการ</p></div><button class="secondary" onclick="app.page(\'settings\')">ไปที่ Settings</button></div>':''}
      <div class="dash-panels"><section class="dash-panel"><div class="dash-panel-head"><div><h3>สินค้าใกล้หมด</h3><p>สินค้าที่ถึงจุดสั่งซื้อ</p></div><button class="secondary" onclick="app.page('receive')">รับสินค้าเข้า</button></div><div class="scroll"><table><tr><th>สินค้า</th><th>คงเหลือ</th><th>ขั้นต่ำ</th><th>สถานะ</th></tr>${d.lowProducts.map(p=>`<tr><td><strong>${esc(p.name)}</strong><small class="dash-subline">${esc(p.productId)}</small></td><td>${p.stockQty} ${esc(p.unit)}</td><td>${p.reorderPoint}</td><td><span class="dash-badge ${p.stockQty<=0?'badge-danger':'badge-warning'}">${p.stockQty<=0?'หมดสต็อก':'ใกล้หมด'}</span></td></tr>`).join('')||'<tr><td colspan="4" class="dash-empty">ไม่มีสินค้าใกล้หมด</td></tr>'}</table></div></section>
      <section class="dash-panel"><div class="dash-panel-head"><div><h3>รายการล่าสุด</h3><p>ประวัติการเคลื่อนไหวล่าสุด</p></div><button class="secondary" onclick="app.page('issue')">เบิกสินค้า</button></div><div class="scroll"><table><tr><th>วันเวลา</th><th>ประเภท</th><th>พนักงาน</th><th>สินค้า</th><th>จำนวน</th><th>คงเหลือ</th></tr>${d.recent.map(t=>`<tr><td>${esc(t.timestamp)}</td><td><span class="dash-badge ${t.type==='ISSUE'?'badge-teal':t.type==='RECEIPT'?'badge-success':'badge-neutral'}">${esc(({ISSUE:'เบิก',RECEIPT:'รับเข้า',ADJUSTMENT:'ปรับยอด'})[t.type]||t.type)}</span></td><td>${esc(t.employee)}</td><td>${esc(t.product)}</td><td>${esc(t.qty)}</td><td>${esc(t.after)}</td></tr>`).join('')||'<tr><td colspan="6" class="dash-empty">ยังไม่มีรายการเบิกหรือรับสินค้า</td></tr>'}</table></div></section></div></section>`;
  }
  function issueView(){selectedEmployee='';$('view').innerHTML=`<div class="issue-heading"><div><span class="dash-eyebrow">PPE ISSUANCE</span><h2>เบิกอุปกรณ์ Safety</h2><p>ตรวจสอบพนักงานและอุปกรณ์ก่อนยืนยันการเบิก</p></div></div><div class="issue-grid"><section class="issue-card"><div class="section-title"><span class="step">01</span><div><h3>ข้อมูลพนักงาน</h3><p>ค้นหาผู้เบิกด้วยรหัสพนักงาน</p></div></div><div class="field">${field('emp','รหัสพนักงาน')}</div><p class="issue-help">กรอกรหัสพนักงานแล้วแตะออกจากช่องเพื่อค้นหา</p><div class="issue-employee"><div class="field"><label for="ename">ชื่อ - นามสกุล</label><input id="ename" readonly placeholder="แสดงหลังค้นหา"></div><div class="field"><label for="dept">แผนก</label><input id="dept" readonly placeholder="แสดงหลังค้นหา"></div></div></section><section class="issue-card"><div class="section-title"><span class="step">02</span><div><h3>เลือกอุปกรณ์</h3><p>เลือกสินค้าและระบุจำนวนที่ต้องการ</p></div></div><div class="issue-selection"><div class="field issue-product"><label for="prod">สินค้า</label><select id="prod">${options()}</select></div>${field('qty','จำนวน','number','1')}</div><div class="stock-info" id="stockInfo">เลือกสินค้าเพื่อดูยอดคงเหลือ</div><div class="field issue-note"><label for="memo">หมายเหตุ (ถ้ามี)</label><textarea id="memo" rows="2" placeholder="ระบุรายละเอียดเพิ่มเติม"></textarea></div></section><section class="issue-card issue-confirm"><div class="issue-confirm-main"><div class="section-title"><span class="step">03</span><div><h3>ตรวจสอบสิทธิ์การเบิก</h3><p>สถานะอ้างอิงจากประวัติการเบิกและยอดคงเหลือ</p></div></div><div id="eligibility" aria-live="polite"></div></div><button onclick="app.issue()">ยืนยันการเบิกสินค้า</button></section></div>`;$('emp').addEventListener('input',()=>{selectedEmployee='';$('ename').value='';$('dept').value='';$('eligibility').innerHTML='';});$('emp').addEventListener('change',findEmployee);$('prod').addEventListener('change',()=>{const p=products.find(x=>x.productId===$('prod').value);$('stockInfo').innerHTML=p?`คงเหลือ <strong>${esc(p.stockQty)} ${esc(p.unit)}</strong> <span class="helper"> · รหัส ${esc(p.productId)}</span>`:'เลือกสินค้าเพื่อดูยอดคงเหลือ';eligible();});}
  async function findEmployee(){const id=$('emp').value.trim();if(!id)return;await run('กำลังค้นหาพนักงาน',async()=>{const r=await api('employee',{token,empId:id});if(!r.found)throw Error('ไม่พบรหัสพนักงาน');if($('emp').value.trim()!==id)return;selectedEmployee=id;$('ename').value=r.employee.fullName;$('dept').value=r.employee.department;await checkEligibility();});}
  async function checkEligibility(){if(!selectedEmployee||!$('prod').value)return;const r=await api('eligibility',{token,empId:selectedEmployee,productId:$('prod').value});$('eligibility').innerHTML=`<div class="msg ${r.allowed?'ok':'bad'}">${esc(r.message)}</div>`;return r;}
  async function eligible(){if(selectedEmployee&&$('prod').value)await run('กำลังตรวจสอบสิทธิ์',checkEligibility);}
  async function issue(){const emp=$('emp').value.trim(),productId=$('prod').value,amount=$('qty').value,note=$('memo').value;if(!emp||!productId||!qty(amount))return alert({icon:'warning',title:'กรุณากรอกข้อมูลให้ครบ',text:'ระบุพนักงาน สินค้า และจำนวนเต็มที่มากกว่า 0'});if(selectedEmployee!==emp)return alert({icon:'warning',title:'กรุณาตรวจสอบรหัสพนักงานก่อน'});if(!await confirm('ยืนยันการเบิก','เบิกสินค้า '+amount+' หน่วย ให้ '+$('ename').value+'?'))return;await run('กำลังบันทึกการเบิก',async()=>{await write('issue',{data:{empId:emp,productId,qty:amount,note}});await refresh();issueView();},'บันทึกการเบิกสำเร็จ');}
  function receiveView(){
    $('view').innerHTML=`<div class="receive-heading"><span class="dash-eyebrow">STOCK RECEIVING WORKSPACE</span><h2>รับสินค้าเข้าคลัง</h2><p>บันทึกสินค้าเข้าและตรวจสอบยอดคงเหลือ</p></div><div class="receive-grid"><section class="receive-card"><div class="section-title"><span class="step">01</span><div><h3>รายละเอียดการรับสินค้า</h3><p>เลือกสินค้าและระบุจำนวนที่รับเข้า</p></div></div><div class="field"><label for="prod">สินค้า</label><select id="prod">${options()}</select></div><div class="receive-quantity">${field('qty','จำนวนที่รับ','number')}</div><div class="field receive-note"><label for="memo">หมายเหตุ / เลขเอกสาร</label><textarea id="memo" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม"></textarea></div><div class="receive-actions"><button onclick="app.receive()">บันทึกรับสินค้า</button></div></section><aside class="receive-card receive-summary"><div class="section-title"><span class="step">02</span><div><h3>สรุปยอดสินค้า</h3><p>ตรวจสอบข้อมูลก่อนบันทึก</p></div></div><div class="receive-product"><span>สินค้า</span><strong id="previewProduct">ยังไม่ได้เลือกสินค้า</strong><small id="previewCode">—</small></div><div id="stockInfo" class="receive-stock-line">เลือกสินค้าเพื่อดูยอดคงเหลือ</div><div class="receive-stock-line"><span>จุดสั่งซื้อ</span><strong id="previewReorder">—</strong></div><div class="receive-stock-line"><span>จำนวนรับเข้า</span><strong id="previewQty">—</strong></div><div class="receive-estimate"><span>ยอดคงเหลือหลังรับโดยประมาณ</span><strong id="previewTotal">—</strong><small>ยอดจริงจะยืนยันเมื่อบันทึกสำเร็จ</small></div></aside></div>`;
    function updatePreview(){
      const p=products.find(x=>x.productId===$('prod').value);
      const value=$('qty').value;
      const valid=value!==''&&qty(value);
      $('previewProduct').textContent=p?p.name:'ยังไม่ได้เลือกสินค้า';
      $('previewCode').textContent=p?'รหัส '+p.productId:'—';
      $('stockInfo').innerHTML=p?`<span>ยอดคงเหลือปัจจุบัน</span><strong>${esc(p.stockQty)} ${esc(p.unit)}</strong>`:'เลือกสินค้าเพื่อดูยอดคงเหลือ';
      $('previewReorder').textContent=p?p.reorderPoint+' '+p.unit:'—';
      $('previewQty').textContent=p&&valid?Number(value)+' '+p.unit:'—';
      $('previewTotal').textContent=p&&valid?(Number(p.stockQty)+Number(value))+' '+p.unit:'—';
    }
    $('prod').addEventListener('change',updatePreview);
    $('qty').addEventListener('input',updatePreview);
  }
  async function receive(){const productId=$('prod').value,amount=$('qty').value,note=$('memo').value;if(!productId||!qty(amount))return alert({icon:'warning',title:'กรุณาเลือกสินค้าและระบุจำนวนเต็มที่มากกว่า 0'});if(!await confirm('ยืนยันรับสินค้า','รับสินค้าเข้า '+amount+' หน่วย?'))return;await run('กำลังบันทึกรับสินค้า',async()=>{await write('receive',{data:{productId,qty:amount,note}});await refresh();receiveView();},'รับสินค้าเข้าสำเร็จ');}
  function settings(){
    const employeeTab=tab==='employees',userTab=tab==='users';
    const records=userTab?users:employeeTab?employees:products;
    const title=userTab?'บัญชีผู้ใช้':employeeTab?'พนักงาน':'สินค้า PPE';
    const addLabel=userTab?'เพิ่มผู้ใช้งาน':employeeTab?'เพิ่มพนักงาน':'เพิ่มสินค้า';
    const buttons=(i)=>`<div class="settings-actions"><button class="secondary" onclick="app.${userTab?'editUser':'edit'}(${i})">แก้ไข</button><button class="danger" onclick="app.${userTab?'removeUser':'remove'}(${i})">ลบ</button></div>`;
    const head=userTab?'<tr><th>Username</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>จัดการ</th></tr>':employeeTab?'<tr><th>รหัสพนักงาน</th><th>ชื่อ</th><th>นามสกุล</th><th>แผนก</th><th>จัดการ</th></tr>':'<tr><th>รหัสสินค้า</th><th>สินค้า</th><th>หน่วย</th><th>คงเหลือ</th><th>จุดสั่งซื้อ</th><th>เบิกซ้ำ</th><th>จัดการ</th></tr>';
    const rows=records.map((v,i)=>{
      const cells=userTab?`<td><strong>${esc(v.username)}</strong></td><td>${esc(v.displayName)}</td><td><span class="settings-badge role">Admin</span></td>`:employeeTab?`<td>${esc(v.empId)}</td><td>${esc(v.firstName)}</td><td>${esc(v.lastName)}</td><td>${esc(v.department)}</td>`:`<td>${esc(v.productId)}</td><td><strong>${esc(v.name)}</strong></td><td>${esc(v.unit)}</td><td><span class="settings-badge ${v.stockQty<=0?'out':v.stockQty<=v.reorderPoint?'warning':'normal'}">${esc(v.stockQty)}</span></td><td>${esc(v.reorderPoint)}</td><td>${v.intervalDays?esc(v.intervalDays)+' วัน':'ไม่จำกัด'}</td>`;
      return `<tr class="settings-record">${cells}<td>${buttons(i)}</td></tr>`;
    }).join('');
    const columns=userTab?4:employeeTab?5:7;
    $('view').innerHTML=`<div class="settings-heading"><span class="dash-eyebrow">MASTER DATA</span><h2>ตั้งค่าระบบ</h2><p>จัดการบัญชีผู้ใช้ พนักงาน และสินค้า PPE</p></div><div class="tabs settings-tabs"><button class="${userTab?'active':''}" onclick="app.setTab('users')">User</button><button class="${employeeTab?'active':''}" onclick="app.setTab('employees')">พนักงาน</button><button class="${tab==='products'?'active':''}" onclick="app.setTab('products')">สินค้า</button></div><section class="settings-card"><div class="settings-toolbar"><div class="settings-title"><h3>${title}</h3><span class="settings-count">${records.length} รายการ</span></div><div class="settings-tools"><label class="settings-search" for="settingsSearch"><span aria-hidden="true">⌕</span><input id="settingsSearch" type="search" placeholder="ค้นหา${title}" aria-label="ค้นหา${title}"></label><button onclick="app.${userTab?'editUser':'edit'}(-1)">+ ${addLabel}</button></div></div><div class="scroll"><table class="settings-table"><thead>${head}</thead><tbody>${rows}<tr id="settingsEmpty" ${records.length?'hidden':''}><td colspan="${columns}" class="dash-empty">${records.length?'ไม่พบรายการที่ค้นหา':'ยังไม่มีข้อมูล'}</td></tr></tbody></table></div></section>`;
    $('settingsSearch').addEventListener('input',event=>{
      const term=event.target.value.trim().toLocaleLowerCase();
      let visible=0;
      document.querySelectorAll('.settings-record').forEach(row=>{
        const match=row.textContent.toLocaleLowerCase().includes(term);
        row.hidden=!match;
        if(match)visible++;
      });
      $('settingsEmpty').hidden=visible>0;
      $('settingsEmpty').querySelector('td').textContent=records.length?'ไม่พบรายการที่ค้นหา':'ยังไม่มีข้อมูล';
    });
  }
  async function setTab(value){if(value==='users'){await run('กำลังโหลดบัญชีผู้ใช้',async()=>{users=await api('users',{token});tab=value;settings();});}else{tab=value;settings();}}
  async function editUser(i){
    const user=i<0?{}:users[i];
    const result=await alert({title:i<0?'เพิ่มบัญชีผู้ใช้':'แก้ไขบัญชีผู้ใช้',html:`<div class="swal-form">${field('userName','Username','text',user.username)}${field('displayName','ชื่อที่แสดง','text',user.displayName)}${field('userPassword',i<0?'รหัสผ่าน (อย่างน้อย 4 ตัว)':'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)','password')}</div>`,showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก',didOpen:()=>{if(i>=0)$('userName').readOnly=true;},preConfirm:()=>{const data={userId:user.userId||'',username:$('userName').value.trim(),displayName:$('displayName').value.trim(),password:$('userPassword').value};if(!data.username||!data.displayName||((i<0||data.password)&&data.password.length<4)){Swal.showValidationMessage('กรุณากรอกชื่อผู้ใช้ ชื่อที่แสดง และรหัสผ่านอย่างน้อย 4 ตัว');return false;}return data;}});
    if(!result.isConfirmed||!await confirm('ยืนยันบันทึกบัญชีผู้ใช้',result.value.username))return;
    await run('กำลังบันทึกบัญชีผู้ใช้',async()=>{await write('saveUser',{data:result.value});users=await api('users',{token});settings();},'บันทึกบัญชีผู้ใช้สำเร็จ');
  }
  async function removeUser(i){const user=users[i];if(!await confirm('ยืนยันลบบัญชีผู้ใช้',user.username+' จะไม่สามารถเข้าสู่ระบบได้'))return;await run('กำลังลบบัญชีผู้ใช้',async()=>{await write('deleteUser',{userId:user.userId});users=await api('users',{token});settings();},'ลบบัญชีผู้ใช้สำเร็จ');}
  async function edit(i){
    const isEmp=tab==='employees',v=i<0?{}:(isEmp?employees[i]:products[i]);
    const fields=isEmp?field('id','รหัสพนักงาน','text',v.empId)+field('first','ชื่อ','text',v.firstName)+field('last','นามสกุล','text',v.lastName)+field('department','แผนก','text',v.department):field('name','ชื่อสินค้า','text',v.name)+field('unit','หน่วย','text',v.unit)+field('stock','ยอดคงเหลือ','number',v.stockQty??0)+field('reorder','จุดสั่งซื้อ','number',v.reorderPoint??0)+field('interval','เบิกซ้ำได้ทุก (วัน)','number',v.intervalDays??0);
    const result=await alert({title:(i<0?'เพิ่ม':'แก้ไข')+(isEmp?'พนักงาน':'สินค้า'),html:`<div class="swal-form">${fields}</div>`,width:650,showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก',didOpen:()=>{if(i>=0&&isEmp)$('id').readOnly=true;},preConfirm:()=>{
      const id=isEmp?$('id').value.trim():(v.productId||'');let data;
      if(isEmp){data={empId:id,firstName:$('first').value.trim(),lastName:$('last').value.trim(),department:$('department').value.trim()};if(!id||!data.firstName||!data.lastName||!data.department){Swal.showValidationMessage('กรุณากรอกข้อมูลพนักงานให้ครบ');return false;}}
      else{data={productId:id,productName:$('name').value.trim(),unit:$('unit').value.trim(),stockQty:$('stock').value,reorderPoint:$('reorder').value,issueIntervalDays:$('interval').value};if(i>=0)data.expectedStock=v.stockQty;if(!data.productName||!data.unit||[data.stockQty,data.reorderPoint,data.issueIntervalDays].some(x=>x===''||!Number.isInteger(Number(x))||Number(x)<0)){Swal.showValidationMessage('กรอกข้อมูลให้ครบ และระบุจำนวนเต็มตั้งแต่ 0 ขึ้นไป');return false;}}
      if(i<0&&isEmp&&employees.some(x=>x.empId===id)){Swal.showValidationMessage('รหัสนี้มีอยู่แล้ว กรุณาใช้ปุ่มแก้ไข');return false;}return {id:isEmp?id:data.productName,data};
    }});
    if(!result.isConfirmed||!await confirm('ยืนยันบันทึกข้อมูล',result.value.id))return;
    await run('กำลังบันทึกข้อมูล',async()=>{await write(isEmp?'saveEmployee':'saveProduct',{data:result.value.data});await refresh();settings();},'บันทึกข้อมูลสำเร็จ');
  }
  async function remove(i){const isEmp=tab==='employees',v=(isEmp?employees:products)[i],id=isEmp?v.empId:v.productId;if(!await confirm('ยืนยันลบรายการ',id+' — ประวัติรายการเดิมยังคงอยู่'))return;await run('กำลังลบข้อมูล',async()=>{await write(isEmp?'deleteEmployee':'deleteProduct',isEmp?{empId:id}:{productId:id});await refresh();settings();},'ลบรายการสำเร็จ');}
  return {login,logout,page,issue,receive,setTab,edit,remove,editUser,removeUser,togglePassword};
})();
