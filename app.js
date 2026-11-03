const app = (() => {
  let token = '', products = [], employees = [], users = [], tab = 'employees', selectedEmployee = '', dateReportData = null;
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
  async function refreshProducts(){products=await api('products',{token});products.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'th',{numeric:true,sensitivity:'base'}));}
  async function refreshEmployees(){employees=await api('employees',{token});}
  async function refresh(){await Promise.all([refreshProducts(),refreshEmployees()]);}
  async function run(title, fn, success) { try { loading(title); const result=await fn(); Swal.close(); if(success) await alert({icon:'success',title:success}); return result; } catch(e){Swal.close();await error(e);return null;} }
  function productLabel(p){return [p.name,p.brand,p.model,p.size?'Size '+p.size:''].filter(Boolean).join(' · ');}
  function options(){return '<option value="">เลือกสินค้า</option>'+products.map(p=>`<option value="${esc(p.productId)}">${esc(productLabel(p))} (${p.stockQty} ${esc(p.unit)})</option>`).join('');}
  function field(id,label,type='text',value=''){return `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(value)}" ${type==='number'?'min="0" step="1"':''}></div>`;}
  function qty(value){const n=Number(value);return Number.isInteger(n)&&n>0;}
  async function login(){const button=$('loginSubmit');if(button.disabled)return;const username=$('username').value.trim(),password=$('password').value;if(!username||!password)return alert({icon:'warning',title:'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'});button.disabled=true;try{if(!await confirm('เข้าสู่ระบบ','เข้าสู่ระบบด้วย '+username+'?'))return;button.classList.add('is-loading');button.setAttribute('aria-busy','true');button.querySelector('.login-label').textContent='กำลังเข้าสู่ระบบ';await run('กำลังเข้าสู่ระบบ',async()=>{const r=await api('login',{username,password});token=r.token;$('who').textContent=r.user.displayName;await Promise.all([refresh(),render('dash')]);$('login').hidden=true;$('app').hidden=false;},'เข้าสู่ระบบสำเร็จ');}finally{button.disabled=false;button.classList.remove('is-loading');button.removeAttribute('aria-busy');button.querySelector('.login-label').textContent='เข้าสู่ระบบ';}}
  function togglePassword(){const input=$('password'),button=document.querySelector('.password-toggle'),show=input.type==='password';input.type=show?'text':'password';button.textContent=show?'ซ่อน':'แสดง';button.setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน');button.setAttribute('aria-pressed',String(show));}
  async function logout(){if(!await confirm('ออกจากระบบ','ต้องการออกจากระบบใช่หรือไม่'))return;await run('กำลังออกจากระบบ',async()=>{await write('logout',{});token='';$('app').hidden=true;$('login').hidden=false;$('password').value='';},'ออกจากระบบแล้ว');}
  async function page(name){if(name==='settings')tab='users';await run('กำลังโหลดข้อมูล',()=>render(name));}
  async function render(name){document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===name));const title=({dash:'Dashboard',issue:'เบิกอุปกรณ์',receive:'รับสินค้าเข้า',report:'Report',settings:'ตั้งค่า'})[name]||'ตั้งค่า';$('pageTitle').textContent=title;$('pageBreadcrumb').textContent=title;if(name==='dash')return dashboard();if(name==='issue')return issueView();if(name==='receive')return receiveView();if(name==='report')return reportView();await refresh();if(tab==='users')users=await api('users',{token});return settings();}
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
    const alerts=sortStockAlerts(d.lowProducts);
    $('view').innerHTML=`<section class="dashboard command-center">
      <div class="dash-heading"><div><span class="dash-eyebrow">SAFETY INVENTORY</span><h2>ภาพรวมสต็อก</h2><p>ติดตามสถานะอุปกรณ์ Safety และรายการเคลื่อนไหว</p></div><button class="secondary dash-refresh" onclick="app.page('dash')">↻ รีเฟรช</button></div>
      <div class="dash-kpis">${metrics.map((m,i)=>`<div class="dash-kpi dash-kpi-${i}"><div class="dash-kpi-top"><span>${m[0]}</span><span class="dash-icon">${icons[i]}</span></div><div class="dash-value">${m[1]}</div><small>${m[2]}</small></div>`).join('')}</div>
      ${!d.products?'<div class="dash-onboard"><div><strong>เริ่มต้นใช้งาน SafeStock</strong><p>เพิ่มสินค้าและพนักงานใน Settings เพื่อเริ่มทำรายการ</p></div><button class="secondary" onclick="app.page(\'settings\')">ไปที่ Settings</button></div>':''}
      <div class="command-layout"><section class="dash-panel command-stock"><div class="dash-panel-head"><div><h3>สินค้าที่ต้องติดตาม <span class="command-count">${alerts.length}</span></h3><p>รายการสินค้าที่หมดหรือถึงจุดสั่งซื้อ</p></div><div class="stock-alert-toolbar"><label class="stock-alert-search" for="stockAlertSearch"><span aria-hidden="true">⌕</span><input id="stockAlertSearch" type="search" placeholder="ค้นหาสินค้า, Size, Brand หรือรหัส" aria-label="ค้นหาสินค้าที่ต้องติดตาม"></label><label class="stock-alert-filter"><span class="stock-alert-filter-label">สถานะ</span><select id="stockAlertFilter" aria-label="กรองตามสถานะ"><option value="all">ทั้งหมด</option><option value="out">หมดสต็อก</option><option value="low">ถึงจุดสั่งซื้อ</option></select></label><button class="secondary" onclick="app.page('receive')">รับสินค้าเข้า</button></div></div><div id="stockAlertList" class="command-list" aria-live="polite"></div><div id="stockAlertFooter" class="stock-alert-footer" hidden><span id="stockAlertCount"></span></div></section>
      <div class="command-side"><section class="dash-panel"><div class="dash-panel-head"><div><h3>รายการเคลื่อนไหวล่าสุด</h3><p>ประวัติการเบิกและรับสินค้าเข้า</p></div></div><div class="command-activity">${d.recent.map(t=>`<article class="command-activity-row"><div class="command-movement ${t.type==='ISSUE'?'is-issue':t.type==='RECEIPT'?'is-receipt':'is-adjust'}" aria-hidden="true">${t.type==='ISSUE'?'↗':t.type==='RECEIPT'?'↓':'↔'}</div><div class="command-activity-main"><div class="command-activity-title"><strong>${esc(({ISSUE:'เบิกอุปกรณ์',RECEIPT:'รับสินค้าเข้า',ADJUSTMENT:'ปรับยอดสต็อก'})[t.type]||t.type)}</strong><time>${esc(t.timestamp)}</time></div><div class="command-activity-product">${esc(t.product||'—')}</div><small>${t.employee&&t.employee!=='-'?'พนักงาน '+esc(t.employee)+' · ':''}จำนวน ${esc(t.qty)} · คงเหลือ ${esc(t.after)}</small></div></article>`).join('')||'<div class="command-empty"><span aria-hidden="true">○</span><strong>ยังไม่มีรายการเคลื่อนไหวล่าสุด</strong><small>รายการเบิก รับเข้า และปรับยอดจะแสดงที่นี่</small></div>'}</div></section><section class="dash-panel command-shortcuts"><div class="dash-panel-head"><div><h3>เมนูใช้งานด่วน</h3><p>เลือกทำรายการที่ต้องการ</p></div></div><div class="command-shortcut-list"><button onclick="app.page('issue')"><span aria-hidden="true">↗</span>เบิกอุปกรณ์</button><button onclick="app.page('receive')"><span aria-hidden="true">↓</span>รับสินค้าเข้า</button><button onclick="app.page('report')"><span aria-hidden="true">≡</span>ดูประวัติการเบิก</button></div></section></div></div></section>`;
    const drawAlerts=()=>{
      const term=$('stockAlertSearch').value.trim().toLocaleLowerCase(),filter=$('stockAlertFilter').value;
      const matched=alerts.filter(p=>{
        const out=Number(p.stockQty)<=0;
        const status=filter==='all'||(filter==='out'&&out)||(filter==='low'&&!out);
        return status&&[p.name,p.brand,p.model,p.size,p.productId].some(v=>String(v??'').toLocaleLowerCase().includes(term));
      });
      const shown=matched;
      $('stockAlertList').innerHTML=shown.map(p=>`<article class="command-stock-row"><div class="command-item-icon" aria-hidden="true">${icons[0]}</div><div class="command-stock-name"><strong>${esc(productLabel(p))}</strong><small>รหัส ${esc(p.productId)}</small></div><div class="command-stock-amount"><strong>${esc(p.stockQty)} ${esc(p.unit)}</strong><small>ขั้นต่ำ ${esc(p.reorderPoint)} ${esc(p.unit)}</small></div><span class="dash-badge ${Number(p.stockQty)<=0?'badge-danger':'badge-warning'}">${Number(p.stockQty)<=0?'หมดสต็อก':'ถึงจุดสั่งซื้อ'}</span></article>`).join('')||`<div class="command-empty"><span aria-hidden="true">${alerts.length?'⌕':'✓'}</span><strong>${alerts.length?'ไม่พบสินค้าตามเงื่อนไข':'ไม่มีสินค้าที่ต้องติดตาม'}</strong><small>${alerts.length?'ลองเปลี่ยนคำค้นหาหรือตัวกรอง':'ยังไม่มีสินค้าหมดหรือถึงจุดสั่งซื้อ'}</small></div>`;
      $('stockAlertFooter').hidden=matched.length===0;
      $('stockAlertCount').textContent='แสดง '+shown.length+' จาก '+matched.length+' รายการ';
    };
    $('stockAlertSearch').addEventListener('input',drawAlerts);
    $('stockAlertFilter').addEventListener('change',drawAlerts);
    drawAlerts();
  }
  function sortStockAlerts(items){return [...items].sort((a,b)=>{
    const aq=Number(a.stockQty),bq=Number(b.stockQty),az=aq<=0,bz=bq<=0;
    if(az!==bz)return az?-1:1;
    if(!az){const ar=Number(a.reorderPoint)>0?aq/Number(a.reorderPoint):Infinity,br=Number(b.reorderPoint)>0?bq/Number(b.reorderPoint):Infinity;if(ar!==br)return ar-br;}
    return String(a.name||'').localeCompare(String(b.name||''),'th',{numeric:true,sensitivity:'base'})||String(a.size||'').localeCompare(String(b.size||''),'th',{numeric:true,sensitivity:'base'});
  });}
  function issueView(){selectedEmployee='';$('view').innerHTML=`<div class="issue-heading"><div><span class="dash-eyebrow">PPE ISSUANCE</span><h2>เบิกอุปกรณ์ Safety</h2><p>ตรวจสอบพนักงานและอุปกรณ์ก่อนยืนยันการเบิก</p></div></div><div class="issue-grid"><section class="issue-card"><div class="section-title"><span class="step">01</span><div><h3>ข้อมูลพนักงาน</h3><p>ค้นหาผู้เบิกด้วยรหัสพนักงาน</p></div></div><div class="field">${field('emp','รหัสพนักงาน')}</div><p class="issue-help">กรอกรหัสพนักงานแล้วแตะออกจากช่องเพื่อค้นหา</p><div class="issue-employee"><div class="field"><label for="ename">ชื่อ - นามสกุล</label><input id="ename" readonly placeholder="แสดงหลังค้นหา"></div><div class="field"><label for="dept">แผนก</label><input id="dept" readonly placeholder="แสดงหลังค้นหา"></div></div></section><section class="issue-card"><div class="section-title"><span class="step">02</span><div><h3>เลือกอุปกรณ์</h3><p>เลือกสินค้าและระบุจำนวนที่ต้องการ</p></div></div><div class="issue-selection"><div class="field issue-product"><label for="item">Item</label><select id="item"><option value="">เลือก Item</option></select></div><div class="field issue-size"><label for="prod">Size</label><select id="prod" disabled><option value="">เลือก Item ก่อน</option></select></div>${field('qty','จำนวน','number','1')}</div><div class="stock-info" id="stockInfo">เลือกสินค้าเพื่อดูยอดคงเหลือ</div><div class="field issue-note"><label for="memo">หมายเหตุ (ถ้ามี)</label><textarea id="memo" rows="2" placeholder="ระบุรายละเอียดเพิ่มเติม"></textarea></div></section><section class="issue-card issue-confirm"><div class="issue-confirm-main"><div class="section-title"><span class="step">03</span><div><h3>ตรวจสอบสิทธิ์การเบิก</h3><p>สถานะอ้างอิงจากประวัติการเบิกและยอดคงเหลือ</p></div></div><div id="eligibility" aria-live="polite"></div></div><button onclick="app.issue()">ยืนยันการเบิกสินค้า</button></section></div>`;const itemKey=value=>String(value??'').trim().replace(/\s+/g,' ').toLowerCase();const names=new Map();products.forEach(p=>{const k=itemKey(p.name);if(k&&!names.has(k))names.set(k,String(p.name).trim())});$('item').innerHTML+=[...names].map(([key,name])=>`<option value="${esc(key)}">${esc(name)}</option>`).join('');$('item').addEventListener('change',()=>{const key=$('item').value;const matches=products.filter(p=>itemKey(p.name)===key);$('prod').innerHTML='<option value="">'+(key?'เลือก Size':'เลือก Item ก่อน')+'</option>'+matches.map(p=>`<option value="${esc(p.productId)}">${esc(p.size||'ไม่ระบุ Size')} · ${esc([p.brand,p.model].filter(Boolean).join(' / ')||'ไม่ระบุ Brand / Model')} · ${esc(p.stockQty)} ${esc(p.unit)} · ${esc(p.productId)}</option>`).join('');$('prod').disabled=!key;$('stockInfo').textContent='เลือก Size เพื่อดูยอดคงเหลือ';$('eligibility').innerHTML='';});$('emp').addEventListener('input',()=>{selectedEmployee='';$('ename').value='';$('dept').value='';$('eligibility').innerHTML='';});$('emp').addEventListener('change',findEmployee);$('prod').addEventListener('change',()=>{$('eligibility').innerHTML='';const p=products.find(x=>x.productId===$('prod').value);$('stockInfo').innerHTML=p?`คงเหลือ <strong>${esc(p.stockQty)} ${esc(p.unit)}</strong> <span class="helper"> · รหัส ${esc(p.productId)}</span>`:'เลือกสินค้าเพื่อดูยอดคงเหลือ';eligible();});}
  async function findEmployee(){const id=$('emp').value.trim();if(!id)return;await run('กำลังค้นหาพนักงาน',async()=>{const r=await api('employee',{token,empId:id});if(!r.found)throw Error('ไม่พบรหัสพนักงาน');if($('emp').value.trim()!==id)return;selectedEmployee=r.employee.empId;$('emp').value=selectedEmployee;$('ename').value=r.employee.fullName;$('dept').value=r.employee.department;await checkEligibility();});}
  async function checkEligibility(){if(!selectedEmployee||!$('prod').value)return;const employeeId=selectedEmployee,productId=$('prod').value;const r=await api('eligibility',{token,empId:employeeId,productId});if(!$('prod')||selectedEmployee!==employeeId||$('prod').value!==productId)return;$('eligibility').innerHTML=`<div class="msg ${r.allowed?'ok':r.reason==='INTERVAL'?'warning':'bad'}">${esc(r.message)}${r.reason==='INTERVAL'?'<br><small>หากมีใบ Memo สามารถระบุรายละเอียดเพื่อขอเบิกก่อนกำหนดได้</small>':''}</div>`;return r;}
  async function eligible(){if(selectedEmployee&&$('prod').value)await run('กำลังตรวจสอบสิทธิ์',checkEligibility);}
  async function issue(){const emp=$('emp').value.trim(),productId=$('prod').value,amount=$('qty').value,note=$('memo').value;if(!emp||!productId||!qty(amount))return alert({icon:'warning',title:'กรุณากรอกข้อมูลให้ครบ',text:'ระบุพนักงาน สินค้า และจำนวนเต็มที่มากกว่า 0'});if(selectedEmployee!==emp)return alert({icon:'warning',title:'กรุณาตรวจสอบรหัสพนักงานก่อน'});
    const eligibility=await run('กำลังตรวจสอบสิทธิ์',checkEligibility);if(!eligibility)return;
    let memoOverride=false,memoReference='';
    if(!eligibility.allowed){
      if(eligibility.reason!=='INTERVAL')return alert({icon:'error',title:'ไม่สามารถเบิกสินค้าได้',text:eligibility.message});
      const memo=await alert({icon:'warning',title:'ยังไม่ครบกำหนดเบิก',html:`<div class="import-dialog"><p>${esc(eligibility.message)}</p><p>หากมีใบ Memo ที่อนุญาตให้เบิกก่อนกำหนด กรุณาระบุเลขที่หรือรายละเอียดเพื่อยืนยัน</p></div>`,input:'text',inputLabel:'เลขที่หรือรายละเอียด Memo',inputAttributes:{maxlength:'500',autocomplete:'off'},showCancelButton:true,confirmButtonText:'มี Memo และยืนยันเบิก',cancelButtonText:'ยกเลิก',inputValidator:value=>!value||!value.trim()?'กรุณาระบุเลขที่หรือรายละเอียด Memo':undefined});
      if(!memo.isConfirmed)return;memoOverride=true;memoReference=memo.value.trim();
    }
    if(!await confirm('ยืนยันการเบิก','เบิกสินค้า '+amount+' หน่วย ให้ '+$('ename').value+(memoOverride?' โดยใช้ Memo '+memoReference:'')+'?'))return;
    await run('กำลังบันทึกการเบิก',async()=>{await write('issue',{data:{empId:emp,productId,qty:amount,note,memoOverride,memoReference}});await refreshProducts();issueView();},'บันทึกการเบิกสำเร็จ');}
  function receiveView(){
    $('view').innerHTML=`<div class="receive-heading"><span class="dash-eyebrow">STOCK RECEIVING WORKSPACE</span><h2>รับสินค้าเข้าคลัง</h2><p>บันทึกสินค้าเข้าและตรวจสอบยอดคงเหลือ</p></div><div class="receive-grid"><section class="receive-card"><div class="section-title"><span class="step">01</span><div><h3>รายละเอียดการรับสินค้า</h3><p>เลือกสินค้าและระบุจำนวนที่รับเข้า</p></div></div><div class="field"><label for="prod">สินค้า</label><select id="prod">${options()}</select></div><div class="receive-quantity">${field('qty','จำนวนที่รับ','number')}</div><div class="field receive-note"><label for="memo">หมายเหตุ / เลขเอกสาร</label><textarea id="memo" rows="3" placeholder="ระบุรายละเอียดเพิ่มเติม"></textarea></div><div class="receive-actions"><button onclick="app.receive()">บันทึกรับสินค้า</button></div></section><aside class="receive-card receive-summary"><div class="section-title"><span class="step">02</span><div><h3>สรุปยอดสินค้า</h3><p>ตรวจสอบข้อมูลก่อนบันทึก</p></div></div><div class="receive-product"><span>สินค้า</span><strong id="previewProduct">ยังไม่ได้เลือกสินค้า</strong><small id="previewCode">—</small></div><div id="stockInfo" class="receive-stock-line">เลือกสินค้าเพื่อดูยอดคงเหลือ</div><div class="receive-stock-line"><span>จุดสั่งซื้อ</span><strong id="previewReorder">—</strong></div><div class="receive-stock-line"><span>จำนวนรับเข้า</span><strong id="previewQty">—</strong></div><div class="receive-estimate"><span>ยอดคงเหลือหลังรับโดยประมาณ</span><strong id="previewTotal">—</strong><small>ยอดจริงจะยืนยันเมื่อบันทึกสำเร็จ</small></div></aside></div>`;
    function updatePreview(){
      const p=products.find(x=>x.productId===$('prod').value);
      const value=$('qty').value;
      const valid=value!==''&&qty(value);
      $('previewProduct').textContent=p?productLabel(p):'ยังไม่ได้เลือกสินค้า';
      $('previewCode').textContent=p?'รหัส '+p.productId:'—';
      $('stockInfo').innerHTML=p?`<span>ยอดคงเหลือปัจจุบัน</span><strong>${esc(p.stockQty)} ${esc(p.unit)}</strong>`:'เลือกสินค้าเพื่อดูยอดคงเหลือ';
      $('previewReorder').textContent=p?p.reorderPoint+' '+p.unit:'—';
      $('previewQty').textContent=p&&valid?Number(value)+' '+p.unit:'—';
      $('previewTotal').textContent=p&&valid?(Number(p.stockQty)+Number(value))+' '+p.unit:'—';
    }
    $('prod').addEventListener('change',updatePreview);
    $('qty').addEventListener('input',updatePreview);
  }
  async function receive(){const productId=$('prod').value,amount=$('qty').value,note=$('memo').value;if(!productId||!qty(amount))return alert({icon:'warning',title:'กรุณาเลือกสินค้าและระบุจำนวนเต็มที่มากกว่า 0'});if(!await confirm('ยืนยันรับสินค้า','รับสินค้าเข้า '+amount+' หน่วย?'))return;await run('กำลังบันทึกรับสินค้า',async()=>{await write('receive',{data:{productId,qty:amount,note}});await refreshProducts();receiveView();},'รับสินค้าเข้าสำเร็จ');}
  function reportView(){
    dateReportData=null;
    $('view').innerHTML=`<div class="heading"><div><span class="dash-eyebrow">ISSUANCE REPORT</span><h2>รายงานการเบิก</h2><p>ค้นหาประวัติรายพนักงานหรือรายงานตามวันที่</p></div></div><div class="tabs settings-tabs report-tabs"><button type="button" id="employeeReportTab" class="active" onclick="app.setReportTab('employee')">ประวัติรายพนักงาน</button><button type="button" id="dateReportTab" onclick="app.setReportTab('date')">รายงานตามวันที่</button></div><div id="employeeReportPanel" class="box"><form id="reportForm"><div class="row"><div class="field"><label for="reportEmp">รหัสพนักงาน</label><input id="reportEmp" autocomplete="off" placeholder="เช่น 100 หรือ 0100" required></div><div class="field report-search-action"><button type="submit">ค้นหาประวัติ</button></div></div></form><div id="reportResult" aria-live="polite"><p class="helper">กรอกรหัสพนักงานเพื่อดูประวัติการเบิก</p></div></div><div id="dateReportPanel" class="box" hidden><form id="dateReportForm"><div class="row report-date-controls"><div class="field"><label for="reportStart">วันที่เริ่มต้น</label><input id="reportStart" type="date" required></div><div class="field"><label for="reportEnd">วันที่สิ้นสุด</label><input id="reportEnd" type="date" required></div><div class="report-date-buttons"><button type="submit">ค้นหารายการ</button><button type="button" class="secondary" id="reportExport" onclick="app.exportDateReport()" disabled>Export Excel</button></div></div></form><p class="helper">รวมรายการเบิกของทุกคนและประวัติรองเท้าเดิม ตลอดวันเริ่มต้นถึงวันสิ้นสุด</p><div id="dateReportResult" aria-live="polite"><p class="helper">เลือกช่วงวันที่แล้วกดค้นหารายการ</p></div></div>`;
    $('reportForm').addEventListener('submit',event=>{event.preventDefault();searchReport();});
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    $('reportEnd').value=parts.year+'-'+parts.month+'-'+parts.day;$('reportStart').value=parts.year+'-'+parts.month+'-01';
    $('dateReportForm').addEventListener('submit',event=>{event.preventDefault();searchDateReport();});
    ['reportStart','reportEnd'].forEach(id=>$(id).addEventListener('input',()=>{dateReportData=null;$('reportExport').disabled=true;$('dateReportResult').innerHTML='<p class="helper">ช่วงวันที่เปลี่ยนแล้ว กรุณาค้นหาใหม่ก่อน Export</p>';}));
  }
  function setReportTab(name){const isDate=name==='date';$('employeeReportPanel').hidden=isDate;$('dateReportPanel').hidden=!isDate;$('employeeReportTab').classList.toggle('active',!isDate);$('dateReportTab').classList.toggle('active',isDate);}
  async function searchDateReport(){
    const startDate=$('reportStart').value,endDate=$('reportEnd').value;
    if(!startDate||!endDate||startDate>endDate)return alert({icon:'warning',title:'ช่วงวันที่ไม่ถูกต้อง',text:'กรุณาเลือกวันเริ่มต้นไม่เกินวันสิ้นสุด'});
    dateReportData=null;$('reportExport').disabled=true;$('dateReportResult').innerHTML='<p class="helper">กำลังโหลดรายการเบิก</p>';
    await run('กำลังค้นหารายการเบิก',async()=>{
      const result=await api('dateReport',{token,startDate,endDate});
      if(!$('reportStart')||$('reportStart').value!==startDate||$('reportEnd').value!==endDate)return;
      dateReportData=result;$('reportExport').disabled=!result.records.length;
      const rows=result.records.map(t=>`<tr><td>${esc(t.date||'—')}</td><td>${esc(t.empId||'—')}</td><td>${esc(t.employee||'—')}</td><td>${esc(t.department||'—')}</td><td>${esc(t.product||'—')}</td><td>${esc(t.quantity==null?'—':t.quantity)}${t.unit?' '+esc(t.unit):''}</td><td>${esc(t.performedBy||'—')}</td></tr>`).join('');
      $('dateReportResult').innerHTML=`<div class="report-date-summary"><strong>ผลการค้นหา</strong><span>${result.records.length} รายการ</span></div><div class="scroll"><table class="report-date-table"><thead><tr><th>วันเวลาที่เบิก</th><th>รหัสพนักงาน</th><th>ชื่อ–นามสกุล</th><th>แผนก</th><th>สินค้า / Size</th><th>จำนวน</th><th>ผู้ทำรายการ</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="dash-empty">ไม่พบรายการเบิกในช่วงวันที่เลือก</td></tr>'}</tbody></table></div>`;
    });
  }
  async function exportDateReport(){
    const data=dateReportData;if(!data||!data.records.length)return;
    if(typeof XLSX==='undefined')return alert({icon:'error',title:'ไม่สามารถ Export ได้',text:'ตรวจสอบไฟล์ assets/xlsx.full.min.js แล้วรีเฟรชหน้าเว็บ'});
    if(!await confirm('ยืนยัน Export Excel','ส่งออกรายการเบิก '+data.records.length+' รายการ ตั้งแต่ '+data.startDate+' ถึง '+data.endDate+'?'))return;
    await run('กำลังสร้างไฟล์ Excel',async()=>{
      const headers=['วันเวลาที่เบิก','รหัสพนักงาน','ชื่อ–นามสกุล','แผนก','สินค้า / Size','จำนวน','หน่วย','ผู้ทำรายการ','แหล่งข้อมูล'];
      const rows=data.records.map(t=>[t.date||'—',String(t.empId||''),t.employee||'—',t.department||'—',t.product||'—',t.quantity==null?'—':t.quantity,t.unit||'—',t.performedBy||'—',t.source||'—']);
      const sheet=XLSX.utils.aoa_to_sheet([headers,...rows]);sheet['!cols']=[{wch:20},{wch:17},{wch:27},{wch:24},{wch:42},{wch:12},{wch:12},{wch:22},{wch:17}];
      const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,sheet,'Issuance');
      const stamp=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
      XLSX.writeFile(wb,'IssuanceReport_'+stamp.year+stamp.month+stamp.day+'_'+stamp.hour+stamp.minute+stamp.second+'.xlsx');
    },'สร้างไฟล์ Excel แล้ว');
  }
  function renderHistoryTimeline(records){
    const icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/></svg>';
    const historyIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5m4-1v5l3 2"/></svg>';
    const entries=records.map((record,i)=>{const amount=record.source==='ประวัติเดิม'?'1 คู่':record.qty==null||record.qty===''||record.qty==='—'?'ไม่ระบุ':String(record.qty);return `<li class="history-entry ${i===0?'history-entry-latest':''}"><span class="history-dot" aria-hidden="true"></span><article class="history-card"><div class="history-card-head"><time>${esc(record.date||'ไม่ระบุวันที่')}</time>${i===0?'<span class="history-latest">ล่าสุด</span>':''}</div><div class="history-content"><span class="history-item-icon">${icon}</span><div class="history-item"><strong>${esc(record.product||'ไม่ระบุสินค้า')}</strong><span>จำนวน: ${esc(amount)}</span></div></div></article></li>`;}).join('');
    return `<section class="history-section"><div class="history-heading"><span class="history-heading-icon">${historyIcon}</span><div><h3>ประวัติการเบิกย้อนหลัง <span class="history-count">${records.length} รายการ</span></h3><p>รายการอุปกรณ์ที่พนักงานเคยได้รับ</p></div></div>${entries?`<ol class="history-timeline">${entries}</ol>`:`<div class="history-empty"><span class="history-heading-icon">${historyIcon}</span><p>ไม่พบประวัติการเบิกอุปกรณ์</p></div>`}</section>`;
  }
  async function searchReport(){
    const empId=$('reportEmp').value.trim();if(!empId)return;
    await run('กำลังค้นหาประวัติ',async()=>{
      const r=await api('employeeReport',{token,empId});if(!r.found)throw Error('ไม่พบรหัสพนักงาน');
      $('reportResult').innerHTML=`<div class="report-person"><strong>${esc(r.employee.fullName)}</strong><span>รหัส ${esc(r.employee.empId)} · ${esc(r.employee.department)}</span></div>${renderHistoryTimeline(r.records)}`;
    });
  }
  function settings(){
    const employeeTab=tab==='employees',userTab=tab==='users';
    const records=userTab?users:employeeTab?employees:products;
    const title=userTab?'บัญชีผู้ใช้':employeeTab?'พนักงาน':'สินค้า PPE';
    const addLabel=userTab?'เพิ่มผู้ใช้งาน':employeeTab?'เพิ่มพนักงาน':'เพิ่มสินค้า';
    const buttons=(i)=>`<div class="settings-actions">${!userTab&&!employeeTab?`<button class="secondary" onclick="app.productDetails(${i})">Detail</button>`:''}<button class="secondary" onclick="app.${userTab?'editUser':'edit'}(${i})">แก้ไข</button><button class="danger" onclick="app.${userTab?'removeUser':'remove'}(${i})">ลบ</button></div>`;
    const head=userTab?'<tr><th>Username</th><th>ชื่อที่แสดง</th><th>สิทธิ์</th><th>จัดการ</th></tr>':employeeTab?'<tr><th>รหัสพนักงาน</th><th>ชื่อ</th><th>นามสกุล</th><th>แผนก</th><th>จัดการ</th></tr>':'<tr><th>สินค้า</th><th>Size</th><th>คงเหลือ</th><th>จัดการ</th></tr>';
    const rows=records.map((v,i)=>{
      const cells=userTab?`<td><strong>${esc(v.username)}</strong></td><td>${esc(v.displayName)}</td><td><span class="settings-badge role">Admin</span></td>`:employeeTab?`<td>${esc(v.empId)}</td><td>${esc(v.firstName)}</td><td>${esc(v.lastName)}</td><td>${esc(v.department)}</td>`:`<td><strong>${esc(v.name)}</strong></td><td>${esc(v.size||'—')}</td><td><span class="settings-badge ${v.stockQty<=0?'out':v.stockQty<=v.reorderPoint?'warning':'normal'}">${esc(v.stockQty)} ${esc(v.unit)}</span></td>`;
      const searchText=userTab||employeeTab?'':[v.productId,v.brand,v.model,v.standard,v.reorderPoint,v.intervalDays,v.pricePerUnit].filter(x=>x!=null).join(' ');
      return `<tr class="settings-record" data-search="${esc(searchText)}">${cells}<td>${buttons(i)}</td></tr>`;
    }).join('');
    const columns=userTab?4:employeeTab?5:4;
    $('view').innerHTML=`<div class="settings-heading"><span class="dash-eyebrow">MASTER DATA</span><h2>ตั้งค่าระบบ</h2><p>จัดการบัญชีผู้ใช้ พนักงาน และสินค้า PPE</p></div><div class="tabs settings-tabs"><button class="${userTab?'active':''}" onclick="app.setTab('users')">User</button><button class="${employeeTab?'active':''}" onclick="app.setTab('employees')">พนักงาน</button><button class="${tab==='products'?'active':''}" onclick="app.setTab('products')">สินค้า</button></div><section class="settings-card"><div class="settings-toolbar"><div class="settings-title"><h3>${title}</h3><span class="settings-count">${records.length} รายการ</span></div><div class="settings-tools"><label class="settings-search" for="settingsSearch"><span aria-hidden="true">⌕</span><input id="settingsSearch" type="search" placeholder="ค้นหา${title}" aria-label="ค้นหา${title}"></label>${employeeTab?'<button class="secondary" onclick="app.importEmployees()">นำเข้าพนักงาน</button>':tab==='products'?'<button class="secondary" onclick="app.importProducts()">นำเข้าสินค้า</button>':''}<button onclick="app.${userTab?'editUser':'edit'}(-1)">+ ${addLabel}</button></div></div><div class="scroll"><table class="settings-table"><thead>${head}</thead><tbody>${rows}<tr id="settingsEmpty" ${records.length?'hidden':''}><td colspan="${columns}" class="dash-empty">${records.length?'ไม่พบรายการที่ค้นหา':'ยังไม่มีข้อมูล'}</td></tr></tbody></table></div></section>`;
    $('settingsSearch').addEventListener('input',event=>{
      const term=event.target.value.trim().toLocaleLowerCase();
      let visible=0;
      document.querySelectorAll('.settings-record').forEach(row=>{
        const match=(row.textContent+' '+row.dataset.search).toLocaleLowerCase().includes(term);
        row.hidden=!match;
        if(match)visible++;
      });
      $('settingsEmpty').hidden=visible>0;
      $('settingsEmpty').querySelector('td').textContent=records.length?'ไม่พบรายการที่ค้นหา':'ยังไม่มีข้อมูล';
    });
  }
  function productDetails(i){
    const p=products[i];if(!p)return;
    const price=p.pricePerUnit==null?'—':Number(p.pricePerUnit).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})+' บาท';
    const fields=[['รหัสสินค้า',p.productId],['ชื่อสินค้า',p.name],['Brand',p.brand],['Model',p.model],['Size',p.size],['Standard',p.standard],['ราคาต่อหน่วย',price],['หน่วย',p.unit],['ยอดคงเหลือ',p.stockQty+' '+p.unit],['จุดสั่งซื้อ',p.reorderPoint+' '+p.unit],['เบิกซ้ำได้ทุก',p.intervalDays?p.intervalDays+' วัน':'ไม่จำกัด']];
    alert({title:'รายละเอียดสินค้า',width:650,showConfirmButton:false,html:`<dl class="product-details">${fields.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value==null||value===''?'—':value)}</dd></div>`).join('')}</dl>`});
  }
  async function setTab(value){if(value==='users'){await run('กำลังโหลดบัญชีผู้ใช้',async()=>{users=await api('users',{token});tab=value;settings();});}else{tab=value;settings();}}
  function downloadEmployeeTemplate(){
    const csv='\uFEFFรหัสพนักงาน,ชื่อ,นามสกุล,แผนก\r\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='employee_import_template.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importEmployees(){
    if(typeof XLSX==='undefined')return alert({icon:'error',title:'ไม่สามารถเปิดตัวอ่านไฟล์',text:'ตรวจสอบว่าอัปโหลดโฟลเดอร์ assets แล้วรีเฟรชหน้าเว็บ'});
    const selection=await alert({title:'นำเข้าพนักงาน',width:620,html:'<div class="import-dialog"><p>เลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV โดยใช้หัวคอลัมน์ รหัสพนักงาน, ชื่อ, นามสกุล, แผนก</p><p>รหัสที่มีอยู่แล้วจะถูกข้าม ไม่แก้ไขข้อมูลเดิม รองรับสูงสุด 1,000 รายการต่อครั้ง</p><button type="button" class="secondary import-template" id="downloadEmployeeTemplate">ดาวน์โหลดไฟล์ตัวอย่าง CSV</button><label for="employeeImportFile">เลือกไฟล์</label><input id="employeeImportFile" type="file" accept=".xlsx,.xls,.csv"><small>หากรหัสขึ้นต้นด้วย 0 ให้กำหนดคอลัมน์เป็นข้อความก่อนบันทึกไฟล์</small></div>',showCancelButton:true,confirmButtonText:'ตรวจสอบไฟล์',cancelButtonText:'ยกเลิก',didOpen:()=>$('downloadEmployeeTemplate').addEventListener('click',downloadEmployeeTemplate),preConfirm:async()=>{
      const file=$('employeeImportFile').files[0];
      if(!file){Swal.showValidationMessage('กรุณาเลือกไฟล์');return false;}
      if(!/\.(xlsx|xls|csv)$/i.test(file.name)||file.size>5*1024*1024){Swal.showValidationMessage('เลือกไฟล์ Excel หรือ CSV ขนาดไม่เกิน 5 MB');return false;}
      try{
        const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',codepage:65001,cellDates:false});
        const sheet=workbook.Sheets[workbook.SheetNames[0]];
        if(!sheet||!sheet['!ref'])throw Error('ไม่พบข้อมูลในชีตแรก');
        const start=XLSX.utils.decode_range(sheet['!ref']).s.r;
        const grid=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:true});
        const headers=(grid.shift()||[]).map(x=>String(x).replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[\s_\-]/g,''));
        const aliases=[['รหัสพนักงาน','empid','employeeid','employeecode'],['ชื่อ','firstname'],['นามสกุล','lastname','surname'],['แผนก','department','dept']];
        const columns=aliases.map(names=>headers.findIndex(h=>names.includes(h)));
        if(columns.some(i=>i<0))throw Error('ไม่พบหัวคอลัมน์ รหัสพนักงาน, ชื่อ, นามสกุล หรือ แผนก');
        const rows=grid.map((r,i)=>({line:start+i+2,empId:String(r[columns[0]]||'').trim(),firstName:String(r[columns[1]]||'').trim(),lastName:String(r[columns[2]]||'').trim(),department:String(r[columns[3]]||'').trim()})).filter(r=>r.empId||r.firstName||r.lastName||r.department);
        if(!rows.length||rows.length>1000)throw Error('ไฟล์ต้องมีข้อมูล 1–1,000 รายการ');
        return rows;
      }catch(e){Swal.showValidationMessage('อ่านไฟล์ไม่สำเร็จ: '+e.message);return false;}
    }});
    if(!selection.isConfirmed)return;
    const rows=selection.value,seen=new Set(),existing=new Set(employees.map(e=>e.empId)),valid=[],skipped=[];
    rows.forEach(r=>{const values=[r.empId,r.firstName,r.lastName,r.department];let reason='';if(values.some(v=>!v))reason='ข้อมูลไม่ครบ';else if(values.some(v=>/^[=+\-@]/.test(v)))reason='ข้อมูลขึ้นต้นด้วยอักขระที่ไม่อนุญาต';else if(values.some(v=>v.length>200))reason='ข้อมูลยาวเกิน 200 ตัวอักษร';else if(seen.has(r.empId))reason='รหัสซ้ำในไฟล์';else if(existing.has(r.empId))reason='รหัสมีอยู่แล้วในระบบ';if(r.empId)seen.add(r.empId);if(reason)skipped.push({line:r.line,empId:r.empId,reason});else valid.push(r);});
    const detail=skipped.slice(0,20).map(r=>`<li>แถว ${r.line}: ${esc(r.empId||'ไม่มีรหัส')} — ${esc(r.reason)}</li>`).join('');
    const preview=valid.slice(0,5).map(r=>`<tr><td>${esc(r.empId)}</td><td>${esc(r.firstName)} ${esc(r.lastName)}</td><td>${esc(r.department)}</td></tr>`).join('');
    const review=await alert({icon:valid.length?'question':'warning',title:'ตรวจสอบก่อนนำเข้า',width:720,html:`<div class="import-dialog"><p>พบ ${rows.length} รายการ · พร้อมนำเข้า ${valid.length} รายการ · ข้าม ${skipped.length} รายการ</p>${preview?`<div class="scroll"><table><tr><th>รหัส</th><th>ชื่อ - นามสกุล</th><th>แผนก</th></tr>${preview}</table></div><small>แสดงตัวอย่างสูงสุด 5 รายการ ระบบจะตรวจรหัสซ้ำทั้งหมดอีกครั้งก่อนบันทึก รวมถึงรายการที่ปิดใช้งาน</small>`:''}${detail?`<p>รายการที่ข้าม:</p><ul>${detail}</ul>${skipped.length>20?'<small>แสดงสูงสุด 20 รายการ</small>':''}`:''}</div>`,showCancelButton:!!valid.length,showConfirmButton:!!valid.length,confirmButtonText:'ยืนยันนำเข้า',cancelButtonText:'ยกเลิก'});
    if(!review.isConfirmed||!valid.length)return;
    try{
      loading('กำลังนำเข้าพนักงาน');
      const result=await write('importEmployees',{rows:valid});
      let refreshWarning='';try{await refresh();settings();}catch(e){refreshWarning=' กรุณารีเฟรชหน้าเพื่อโหลดข้อมูลล่าสุด';}
      Swal.close();
      const allSkipped=skipped.concat(result.skipped||[]);
      const after=allSkipped.slice(0,20).map(r=>`<li>แถว ${r.line}: ${esc(r.empId||'ไม่มีรหัส')} — ${esc(r.reason)}</li>`).join('');
      await alert({icon:allSkipped.length?'warning':'success',title:'นำเข้าพนักงานเสร็จสิ้น',html:`<div class="import-dialog"><p>นำเข้าสำเร็จ ${result.imported} รายการ · ข้าม ${allSkipped.length} รายการ${esc(refreshWarning)}</p>${after?`<ul>${after}</ul>${allSkipped.length>20?'<small>แสดงสูงสุด 20 รายการ</small>':''}`:''}</div>`});
    }catch(e){Swal.close();await error(e);}
  }
  function downloadProductTemplate(){
    const csv='\uFEFFชื่อสินค้า,Brand,Model,Size,Standard,ราคาต่อหน่วย,หน่วย,ยอดคงเหลือ,จุดสั่งซื้อ,เบิกซ้ำได้ทุกวัน\r\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='ppe_import_template.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function importProducts(){
    if(typeof XLSX==='undefined')return alert({icon:'error',title:'ไม่สามารถเปิดตัวอ่านไฟล์',text:'ตรวจสอบว่าอัปโหลดโฟลเดอร์ assets แล้วรีเฟรชหน้าเว็บ'});
    const selection=await alert({title:'นำเข้าสินค้า PPE',width:620,html:'<div class="import-dialog"><p>เลือกไฟล์ Excel (.xlsx, .xls) หรือ CSV ที่มีหัวคอลัมน์ ชื่อสินค้า, หน่วย, ยอดคงเหลือ, จุดสั่งซื้อ, เบิกซ้ำได้ทุกวัน</p><p>ระบบสร้างรหัสสินค้าให้อัตโนมัติ ชื่อสินค้าซ้ำจะถูกเพิ่มเป็นรายการใหม่ ไม่ทับข้อมูลเดิม รองรับสูงสุด 1,000 รายการต่อครั้ง</p><button type="button" class="secondary import-template" id="downloadProductTemplate">ดาวน์โหลดไฟล์ตัวอย่าง CSV</button><label for="productImportFile">เลือกไฟล์</label><input id="productImportFile" type="file" accept=".xlsx,.xls,.csv"><small>ตัวเลขทุกช่องต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป โดย 0 วันหมายถึงไม่มีระยะจำกัดการเบิกซ้ำ</small></div>',showCancelButton:true,confirmButtonText:'ตรวจสอบไฟล์',cancelButtonText:'ยกเลิก',didOpen:()=>$('downloadProductTemplate').addEventListener('click',downloadProductTemplate),preConfirm:async()=>{
      const file=$('productImportFile').files[0];
      if(!file){Swal.showValidationMessage('กรุณาเลือกไฟล์');return false;}
      if(!/\.(xlsx|xls|csv)$/i.test(file.name)||file.size>5*1024*1024){Swal.showValidationMessage('เลือกไฟล์ Excel หรือ CSV ขนาดไม่เกิน 5 MB');return false;}
      try{
        const workbook=XLSX.read(await file.arrayBuffer(),{type:'array',codepage:65001,cellDates:false});
        const sheet=workbook.Sheets[workbook.SheetNames[0]];
        if(!sheet||!sheet['!ref'])throw Error('ไม่พบข้อมูลในชีตแรก');
        const start=XLSX.utils.decode_range(sheet['!ref']).s.r;
        const grid=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:'',blankrows:true});
        const headers=(grid.shift()||[]).map(x=>String(x).replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[\s_\-]/g,''));
        const aliases=[['ชื่อสินค้า','productname','name'],['หน่วย','unit'],['ยอดคงเหลือ','stockqty','stock'],['จุดสั่งซื้อ','reorderpoint','minstock'],['เบิกซ้ำได้ทุกวัน','ระยะเวลาเบิกซ้ำวัน','issueintervaldays','intervaldays']];
        const columns=aliases.map(names=>headers.findIndex(h=>names.includes(h)));
        if(columns.some(i=>i<0))throw Error('ไม่พบหัวคอลัมน์ที่กำหนด กรุณาใช้ไฟล์ตัวอย่าง');
        const optional=[['size','ขนาด'],['standard','มาตรฐาน'],['ราคาต่อหน่วย','ราคา','priceperunit','priceunit','price'],['brand','แบรนด์','ยี่ห้อ'],['model','รุ่น']].map(names=>headers.findIndex(h=>names.includes(h)));
        const rows=grid.map((r,i)=>({line:start+i+2,productName:String(r[columns[0]]??'').trim(),unit:String(r[columns[1]]??'').trim(),stockQty:String(r[columns[2]]??'').trim(),reorderPoint:String(r[columns[3]]??'').trim(),issueIntervalDays:String(r[columns[4]]??'').trim(),size:optional[0]<0?'':String(r[optional[0]]??'').trim(),standard:optional[1]<0?'':String(r[optional[1]]??'').trim(),pricePerUnit:optional[2]<0?'':String(r[optional[2]]??'').trim(),brand:optional[3]<0?'':String(r[optional[3]]??'').trim(),model:optional[4]<0?'':String(r[optional[4]]??'').trim()})).filter(r=>r.productName||r.unit||r.stockQty||r.reorderPoint||r.issueIntervalDays||r.size||r.standard||r.pricePerUnit||r.brand||r.model);
        if(!rows.length||rows.length>1000)throw Error('ไฟล์ต้องมีข้อมูล 1–1,000 รายการ');
        return rows;
      }catch(e){Swal.showValidationMessage('อ่านไฟล์ไม่สำเร็จ: '+e.message);return false;}
    }});
    if(!selection.isConfirmed)return;
    const rows=selection.value,valid=[],skipped=[];
    rows.forEach(r=>{let reason='';const texts=[r.productName,r.unit,r.size,r.standard,r.brand,r.model],nums=[r.stockQty,r.reorderPoint,r.issueIntervalDays];if(!r.productName||!r.unit||nums.some(v=>v===''))reason='ข้อมูลไม่ครบ';else if(texts.some(v=>/^[=+\-@]/.test(v)||v.length>200))reason='ข้อมูลข้อความไม่ถูกต้อง';else if(nums.some(v=>!Number.isSafeInteger(Number(v))||Number(v)<0))reason='จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป';else if(r.pricePerUnit!==''&&(!Number.isFinite(Number(r.pricePerUnit))||Number(r.pricePerUnit)<0))reason='ราคาต่อหน่วยต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป';if(reason)skipped.push({line:r.line,productName:r.productName,reason});else valid.push(r);});
    const details=list=>list.slice(0,20).map(r=>`<li>แถว ${r.line}: ${esc(r.productName||'ไม่มีชื่อ')} — ${esc(r.reason)}</li>`).join('');
    const preview=valid.slice(0,5).map(r=>`<tr><td>${esc(r.productName)}</td><td>${esc(r.brand||'—')}</td><td>${esc(r.model||'—')}</td><td>${esc(r.size||'—')}</td><td>${esc(r.standard||'—')}</td><td>${esc(r.pricePerUnit||'—')}</td><td>${esc(r.unit)}</td><td>${esc(r.stockQty)}</td><td>${esc(r.reorderPoint)}</td><td>${esc(r.issueIntervalDays)}</td></tr>`).join('');
    const review=await alert({icon:valid.length?'question':'warning',title:'ตรวจสอบก่อนนำเข้า',width:900,html:`<div class="import-dialog"><p>พบ ${rows.length} รายการ · พร้อมนำเข้า ${valid.length} รายการ · ข้าม ${skipped.length} รายการ</p>${preview?`<div class="scroll"><table><tr><th>สินค้า</th><th>Brand</th><th>Model</th><th>Size</th><th>Standard</th><th>ราคา</th><th>หน่วย</th><th>คงเหลือ</th><th>จุดสั่งซื้อ</th><th>เบิกซ้ำ (วัน)</th></tr>${preview}</table></div><small>แสดงตัวอย่างสูงสุด 5 รายการ ชื่อที่ซ้ำจะถูกเพิ่มเป็นสินค้าใหม่ โปรดตรวจสอบก่อนยืนยัน</small>`:''}${skipped.length?`<p>รายการที่ข้าม:</p><ul>${details(skipped)}</ul>${skipped.length>20?'<small>แสดงสูงสุด 20 รายการ</small>':''}`:''}</div>`,showCancelButton:!!valid.length,showConfirmButton:!!valid.length,confirmButtonText:'ยืนยันนำเข้า',cancelButtonText:'ยกเลิก'});
    if(!review.isConfirmed||!valid.length)return;
    try{
      loading('กำลังนำเข้าสินค้า');
      const result=await write('importProducts',{rows:valid});
      let refreshWarning='';try{await refresh();settings();}catch(e){refreshWarning=' กรุณารีเฟรชหน้าเพื่อโหลดข้อมูลล่าสุด';}
      Swal.close();const allSkipped=skipped.concat(result.skipped||[]);
      await alert({icon:allSkipped.length?'warning':'success',title:'นำเข้าสินค้าเสร็จสิ้น',html:`<div class="import-dialog"><p>นำเข้าสำเร็จ ${result.imported} รายการ · ข้าม ${allSkipped.length} รายการ${esc(refreshWarning)}</p>${allSkipped.length?`<ul>${details(allSkipped)}</ul>${allSkipped.length>20?'<small>แสดงสูงสุด 20 รายการ</small>':''}`:''}</div>`});
    }catch(e){Swal.close();await error(e);}
  }
  async function editUser(i){
    const user=i<0?{}:users[i];
    const result=await alert({title:i<0?'เพิ่มบัญชีผู้ใช้':'แก้ไขบัญชีผู้ใช้',html:`<div class="swal-form">${field('userName','Username','text',user.username)}${field('displayName','ชื่อที่แสดง','text',user.displayName)}${field('userPassword',i<0?'รหัสผ่าน (อย่างน้อย 4 ตัว)':'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)','password')}</div>`,showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก',didOpen:()=>{if(i>=0)$('userName').readOnly=true;},preConfirm:()=>{const data={userId:user.userId||'',username:$('userName').value.trim(),displayName:$('displayName').value.trim(),password:$('userPassword').value};if(!data.username||!data.displayName||((i<0||data.password)&&data.password.length<4)){Swal.showValidationMessage('กรุณากรอกชื่อผู้ใช้ ชื่อที่แสดง และรหัสผ่านอย่างน้อย 4 ตัว');return false;}return data;}});
    if(!result.isConfirmed||!await confirm('ยืนยันบันทึกบัญชีผู้ใช้',result.value.username))return;
    await run('กำลังบันทึกบัญชีผู้ใช้',async()=>{await write('saveUser',{data:result.value});users=await api('users',{token});settings();},'บันทึกบัญชีผู้ใช้สำเร็จ');
  }
  async function removeUser(i){const user=users[i];if(!await confirm('ยืนยันลบบัญชีผู้ใช้',user.username+' จะไม่สามารถเข้าสู่ระบบได้'))return;await run('กำลังลบบัญชีผู้ใช้',async()=>{await write('deleteUser',{userId:user.userId});users=await api('users',{token});settings();},'ลบบัญชีผู้ใช้สำเร็จ');}
  async function edit(i){
    const isEmp=tab==='employees',v=i<0?{}:(isEmp?employees[i]:products[i]);
    const fields=isEmp?field('id','รหัสพนักงาน','text',v.empId)+field('first','ชื่อ','text',v.firstName)+field('last','นามสกุล','text',v.lastName)+field('department','แผนก','text',v.department):field('name','ชื่อสินค้า','text',v.name)+field('brand','Brand (ถ้ามี)','text',v.brand)+field('model','Model (ถ้ามี)','text',v.model)+field('size','Size (ถ้ามี)','text',v.size)+field('standard','Standard (ถ้ามี)','text',v.standard)+field('price','ราคา/หน่วย (บาท, ถ้ามี)','number',v.pricePerUnit??'')+field('unit','หน่วย','text',v.unit)+field('stock','ยอดคงเหลือ','number',v.stockQty??0)+field('reorder','จุดสั่งซื้อ','number',v.reorderPoint??0)+field('interval','เบิกซ้ำได้ทุก (วัน)','number',v.intervalDays??0);
    const result=await alert({title:(i<0?'เพิ่ม':'แก้ไข')+(isEmp?'พนักงาน':'สินค้า'),html:`<div class="swal-form">${fields}</div>`,width:650,showCancelButton:true,confirmButtonText:'บันทึก',cancelButtonText:'ยกเลิก',didOpen:()=>{if(i>=0&&isEmp)$('id').readOnly=true;if(!isEmp)$('price').step='any';},preConfirm:()=>{
      const id=isEmp?$('id').value.trim():(v.productId||'');let data;
      if(isEmp){data={empId:id,firstName:$('first').value.trim(),lastName:$('last').value.trim(),department:$('department').value.trim()};if(!id||!data.firstName||!data.lastName||!data.department){Swal.showValidationMessage('กรุณากรอกข้อมูลพนักงานให้ครบ');return false;}}
      else{data={productId:id,productName:$('name').value.trim(),brand:$('brand').value.trim(),model:$('model').value.trim(),size:$('size').value.trim(),standard:$('standard').value.trim(),pricePerUnit:$('price').value,unit:$('unit').value.trim(),stockQty:$('stock').value,reorderPoint:$('reorder').value,issueIntervalDays:$('interval').value};if(i>=0)data.expectedStock=v.stockQty;if(!data.productName||!data.unit||[data.stockQty,data.reorderPoint,data.issueIntervalDays].some(x=>x===''||!Number.isInteger(Number(x))||Number(x)<0)|| (data.pricePerUnit!==''&&(!Number.isFinite(Number(data.pricePerUnit))||Number(data.pricePerUnit)<0))){Swal.showValidationMessage('กรอกข้อมูลให้ครบ จำนวนต้องเป็นจำนวนเต็มและราคาไม่ติดลบ');return false;}}
      if(i<0&&isEmp&&employees.some(x=>x.empId===id)){Swal.showValidationMessage('รหัสนี้มีอยู่แล้ว กรุณาใช้ปุ่มแก้ไข');return false;}return {id:isEmp?id:data.productName,data};
    }});
    if(!result.isConfirmed||!await confirm('ยืนยันบันทึกข้อมูล',result.value.id))return;
    await run('กำลังบันทึกข้อมูล',async()=>{await write(isEmp?'saveEmployee':'saveProduct',{data:result.value.data});if(isEmp)await refreshEmployees();else await refreshProducts();settings();},'บันทึกข้อมูลสำเร็จ');
  }
  async function remove(i){const isEmp=tab==='employees',v=(isEmp?employees:products)[i],id=isEmp?v.empId:v.productId;if(!await confirm('ยืนยันลบรายการ',id+' — ประวัติรายการเดิมยังคงอยู่'))return;await run('กำลังลบข้อมูล',async()=>{await write(isEmp?'deleteEmployee':'deleteProduct',isEmp?{empId:id}:{productId:id});if(isEmp)await refreshEmployees();else await refreshProducts();settings();},'ลบรายการสำเร็จ');}
  return {login,logout,page,issue,receive,setTab,edit,remove,editUser,removeUser,togglePassword,importEmployees,importProducts,productDetails,setReportTab,exportDateReport};
})();
