// Grupo Evoluir — funções compartilhadas (login individual + papéis)
(function () {
  const C = window.GEV_CONFIG;
  const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'gev-auth' }
  });

  var perfilCache = null;

  async function getSessao() {
    var r = await sb.auth.getSession();
    return r.data.session;
  }

  async function getPerfil() {
    if (perfilCache) return perfilCache;
    var sessao = await getSessao();
    if (!sessao) return null;
    var r = await sb.from('gev_perfis').select('*').eq('id', sessao.user.id).maybeSingle();
    if (r.error || !r.data) return null;
    perfilCache = r.data;
    return perfilCache;
  }

  // chama em toda página protegida. papeisPermitidos: array, ex ['coordenador','master'] — omitir = qualquer logado.
  async function exigirAcesso(papeisPermitidos) {
    var sessao = await getSessao();
    if (!sessao) {
      window.location.href = raizRelativa() + 'index.html';
      return null;
    }
    var perfil = await getPerfil();
    if (!perfil) {
      await sb.auth.signOut();
      window.location.href = raizRelativa() + 'index.html';
      return null;
    }
    if (papeisPermitidos && papeisPermitidos.indexOf(perfil.papel) === -1) {
      alert('Seu usuário não tem acesso a essa área.');
      window.location.href = raizRelativa() + 'index.html';
      return null;
    }
    return perfil;
  }

  function raizRelativa() {
    // as páginas internas ficam uma pasta abaixo da raiz do GEV
    return '../';
  }

  async function logout() {
    await sb.auth.signOut();
    window.location.href = raizRelativa() + 'index.html';
  }

  function normalizarUsuario(bruto) {
    return (bruto || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(new RegExp('[̀-ͯ]', 'g'), '')
      .replace(/[^a-z0-9]/g, '');
  }

  function emailDoUsuario(usuario) {
    return normalizarUsuario(usuario) + '@gev.local';
  }

  // Menu unico do GEV. O participante comum so enxerga o mural e a propria conta;
  // as ferramentas de reuniao ficam com a coordenacao.
  var ITENS_MENU = [
    { rota: 'mural/',       icone: '🗓️', titulo: 'Mural',         soCoordenacao: false },
    { rota: 'conta/',       icone: '👤', titulo: 'Minha conta',   soCoordenacao: false },
    { rota: 'disparador/',  icone: '📲', titulo: 'Controle remoto', soCoordenacao: true },
    { rota: 'exibidor/',    icone: '🔊', titulo: 'Exibidor',      soCoordenacao: true },
    { rota: 'biblioteca/',  icone: '🎵', titulo: 'Biblioteca',    soCoordenacao: true },
    { rota: 'usuarios/',    icone: '👥', titulo: 'Participantes', soCoordenacao: true }
  ];

  function ehCoordenacao(perfil) {
    return !!perfil && (perfil.papel === 'master' || perfil.papel === 'coordenador');
  }

  // destino: elemento ou id. rotaAtiva: ex 'mural/'
  function montarNav(destino, rotaAtiva, perfil) {
    var nav = typeof destino === 'string' ? document.getElementById(destino) : destino;
    if (!nav) return;
    var coordenacao = ehCoordenacao(perfil);
    nav.innerHTML = '';
    ITENS_MENU.forEach(function (i) {
      if (i.soCoordenacao && !coordenacao) return;
      var a = document.createElement('a');
      a.href = raizRelativa() + i.rota;
      a.textContent = i.icone + ' ' + i.titulo;
      if (i.rota === rotaAtiva) a.className = 'ativo';
      nav.appendChild(a);
    });
  }

  function publicUrlAudio(path) {
    return sb.storage.from(C.bucketAudio).getPublicUrl(path).data.publicUrl;
  }
  function publicUrlMaterial(path) {
    return sb.storage.from(C.bucketMateriais).getPublicUrl(path).data.publicUrl;
  }

  window.GEV = {
    sb: sb,
    getSessao: getSessao,
    getPerfil: getPerfil,
    exigirAcesso: exigirAcesso,
    ehCoordenacao: ehCoordenacao,
    montarNav: montarNav,
    logout: logout,
    normalizarUsuario: normalizarUsuario,
    emailDoUsuario: emailDoUsuario,
    publicUrlAudio: publicUrlAudio,
    publicUrlMaterial: publicUrlMaterial
  };
})();
