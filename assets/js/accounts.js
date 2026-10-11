/* EntreDos account layer. Uses only the Supabase publishable/anon key in the browser. */
(() => {
  const SUPABASE_URL = 'https://reqfdhjajfopgafuzjkv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_0T1d0DAdtXL4YV1wWoLceA_wrgLVvmU';
  const client = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);
  let currentUser = null;
  let currentCoupleId = null;

  function message(id, text, bad = false) {
    const el = $(id); if (!el) return;
    el.textContent = text; el.style.color = bad ? '#a53e52' : '#526d4b';
  }
  function showPanel(panel) {
    ['authForms','accountPanel'].forEach(id => $(id)?.classList.toggle('hidden', id !== panel));
  }
  function showModal() {
    $('accountModal')?.classList.add('open');
    $('accountModal')?.setAttribute('aria-hidden','false');
    document.body.classList.add('account-modal-open');
  }
  function hideModal() {
    $('accountModal')?.classList.remove('open');
    $('accountModal')?.setAttribute('aria-hidden','true');
    document.body.classList.remove('account-modal-open');
  }
  function signedInUI(user, name) {
    const btn = $('accountOpen');
    if (btn) btn.textContent = name ? name : 'Mi perfil';
    const email = $('accountEmail'); if (email) email.textContent = user?.email || '';
    const display = $('profileName'); if (display && name !== undefined) display.value = name || '';
    $('authForms')?.classList.toggle('hidden', !!user);
    $('accountPanel')?.classList.toggle('hidden', !user);
  }
  async function loadProfile() {
    if (!client || !currentUser) return;
    const { data, error } = await client.from('entredos_profiles').select('*').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    currentCoupleId = null;
    const { data: membership, error: memberError } = await client.from('entredos_couple_members')
      .select('couple_id, entredos_couples(status)').eq('user_id', currentUser.id).limit(1).maybeSingle();
    if (!memberError && membership?.couple_id) currentCoupleId = membership.couple_id;
    signedInUI(currentUser, data?.display_name || currentUser.user_metadata?.display_name || '');
    $('profileAnniversary').value = data?.anniversary || '';
    $('coupleStatus').textContent = membership?.entredos_couples?.status === 'linked'
      ? 'Vinculados ❤️' : membership?.entredos_couples?.status === 'pending' ? 'Invitación pendiente' : 'Todavía no has vinculado una cuenta';
    $('coupleInviteTools')?.classList.toggle('hidden', membership?.entredos_couples?.status === 'linked');
    await renderFavorites();
    await renderMemories();
  }
  async function refreshSession() {
    if (!client) { message('authMessage','No se ha podido cargar el sistema de cuentas. Recarga la página.',true); return; }
    const { data } = await client.auth.getSession();
    currentUser = data.session?.user || null;
    if (currentUser) {
      try { await loadProfile(); } catch (e) { message('accountMessage', e.message || 'No se pudo cargar el perfil.', true); }
    } else signedInUI(null, '');
  }
  async function runAuth(promise, success) {
    try {
      const { data, error } = await promise;
      if (error) throw error;
      if (data?.user) currentUser = data.user;
      if (data?.session) currentUser = data.session.user;
      if (currentUser) { await loadProfile(); message('accountMessage', success || 'Listo.'); }
      else message('authMessage', success || 'Revisa tu correo para confirmar la cuenta.');
    } catch (e) { message('authMessage', e.message || 'No se pudo completar la operación.', true); message('accountMessage', e.message || 'No se pudo completar la operación.', true); }
  }
  async function signUp() {
    const email = $('authEmail').value.trim(), password = $('authPassword').value;
    if (password.length < 8) return message('authMessage','Usa una contraseña de al menos 8 caracteres.',true);
    await runAuth(client.auth.signUp({ email, password, options: { data: { display_name: $('authName').value.trim() }, emailRedirectTo: location.origin + location.pathname } }), 'Cuenta creada. Confirma tu correo para activar el acceso.');
  }
  async function signIn() {
    await runAuth(client.auth.signInWithPassword({ email: $('authEmail').value.trim(), password: $('authPassword').value }), 'Has iniciado sesión.');
  }
  async function resetPassword() {
    const email = $('authEmail').value.trim();
    if (!email) return message('authMessage','Escribe primero tu correo electrónico.',true);
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    message('authMessage', error ? error.message : 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.', !!error);
  }
  async function oauth(provider) {
    const { error } = await client.auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } });
    if (error) message('authMessage', error.message, true);
  }
  async function saveProfile() {
    if (!currentUser) return;
    const { error } = await client.from('entredos_profiles').upsert({
      user_id: currentUser.id,
      display_name: $('profileName').value.trim().slice(0,40),
      anniversary: $('profileAnniversary').value || null,
      updated_at: new Date().toISOString()
    });
    if (error) return message('accountMessage', error.message, true);
    signedInUI(currentUser, $('profileName').value.trim());
    message('accountMessage','Perfil guardado.');
  }
  async function createInvite() {
    const { data, error } = await client.rpc('entredos_create_invite');
    if (error) return message('accountMessage', error.message, true);
    const invite = Array.isArray(data) ? data[0] : data;
    $('inviteCodeResult').textContent = invite.invite_code;
    $('inviteCodeWrap').classList.remove('hidden');
    message('accountMessage','Código creado. Compártelo solo con tu pareja.');
  }
  async function acceptInvite() {
    const code = $('acceptInviteCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);
    const { error } = await client.rpc('entredos_accept_invite',{p_code:code});
    if (error) return message('accountMessage',error.message,true);
    message('accountMessage','¡Cuentas vinculadas! ❤️');
    await loadProfile();
  }
  async function saveMemory() {
    if (!currentUser) return;
    const title = $('memoryTitle').value.trim(), body = $('memoryBody').value.trim();
    if (!title) return message('accountMessage','Pon un título al recuerdo.',true);
    const shared = $('memoryShare').checked;
    const { error } = await client.from('entredos_memories').insert({
      owner_id: currentUser.id, couple_id: shared ? currentCoupleId : null,
      title, body, event_date: $('memoryDate').value || null, shared_with_partner: shared && !!currentCoupleId
    });
    if (error) return message('accountMessage',error.message,true);
    $('memoryTitle').value=''; $('memoryBody').value=''; $('memoryDate').value=''; $('memoryShare').checked=false;
    message('accountMessage',shared && currentCoupleId ? 'Recuerdo guardado y compartido.' : 'Recuerdo guardado solo para ti.');
    await renderMemories();
  }
  async function renderFavorites() {
    const host = $('accountFavorites'); if (!host || !currentUser) return;
    const { data, error } = await client.from('entredos_favorites').select('id,question_text,category').order('created_at',{ascending:false}).limit(20);
    if (error) { host.textContent=''; return; }
    host.replaceChildren();
    if (!data?.length) { host.textContent='Aún no tienes preguntas favoritas guardadas en tu cuenta.'; return; }
    data.forEach(item => { const row=document.createElement('div'); row.className='account-list-item'; const p=document.createElement('p'); p.textContent=item.question_text; const small=document.createElement('small'); small.textContent=item.category; row.append(p,small); host.append(row); });
  }
  async function renderMemories() {
    const host = $('accountMemories'); if (!host || !currentUser) return;
    const { data, error } = await client.from('entredos_memories').select('id,title,body,event_date,shared_with_partner').order('created_at',{ascending:false}).limit(20);
    if (error) { host.textContent=''; return; }
    host.replaceChildren();
    if (!data?.length) { host.textContent='Todavía no hay recuerdos guardados.'; return; }
    data.forEach(item => { const row=document.createElement('div'); row.className='account-list-item'; const title=document.createElement('strong'); title.textContent=item.title; const p=document.createElement('p'); p.textContent=item.body; const small=document.createElement('small'); small.textContent=(item.event_date || 'Sin fecha')+' · '+(item.shared_with_partner?'Compartido':'Solo para ti'); row.append(title,p,small); host.append(row); });
  }
  async function saveFavorite(item) {
    if (!currentUser) { message('authMessage','Inicia sesión para guardar favoritos.'); showModal(); return false; }
    const { error } = await client.from('entredos_favorites').upsert({
      user_id: currentUser.id, question_id: String(item.id || item.text).slice(0,180),
      question_text: String(item.text).slice(0,600), category: String(item.category || 'General').slice(0,60)
    }, { onConflict:'user_id,question_id' });
    if (error) { message('accountMessage',error.message,true); return false; }
    await renderFavorites(); return true;
  }
  window.EntreDosAccounts = {
    client, get user(){ return currentUser; }, open:showModal, close:hideModal, saveFavorite,
    async signOut(){ await client.auth.signOut(); currentUser=null; currentCoupleId=null; signedInUI(null,''); message('authMessage','Has cerrado sesión.'); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    $('accountOpen')?.addEventListener('click',()=>{showModal();refreshSession()});
    $('accountClose')?.addEventListener('click',hideModal);
    $('accountModal')?.addEventListener('click',e=>{if(e.target===$('accountModal'))hideModal()});
    $('authSignUp')?.addEventListener('click',signUp);
    $('authSignIn')?.addEventListener('click',signIn);
    $('authReset')?.addEventListener('click',resetPassword);
    $('authGoogle')?.addEventListener('click',()=>oauth('google'));
    $('authApple')?.addEventListener('click',()=>oauth('apple'));
    $('saveProfile')?.addEventListener('click',saveProfile);
    $('createInvite')?.addEventListener('click',createInvite);
    $('acceptInvite')?.addEventListener('click',acceptInvite);
    $('saveMemory')?.addEventListener('click',saveMemory);
    $('accountSignOut')?.addEventListener('click',()=>window.EntreDosAccounts.signOut());
    $('copyInvite')?.addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('inviteCodeResult').textContent);message('accountMessage','Código copiado.')}catch(e){message('accountMessage','Copia este código manualmente.')}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')hideModal()});
    if (client) client.auth.onAuthStateChange((_event, session)=>{currentUser=session?.user||null;if(currentUser) setTimeout(()=>loadProfile().catch(e=>message('accountMessage',e.message,true)),0);else signedInUI(null,'')});
    refreshSession();
  });
})();