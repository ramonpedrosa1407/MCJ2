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

  // Menu unico do GEV. O que cada aba exige:
  //   todos            -> qualquer pessoa logada
  //   midia-controle   -> acesso a midia 'controle' ou 'completo'
  //   midia-completo   -> acesso a midia 'completo'
  //   coordenacao      -> coordenador ou master
  // A ordem aqui e a ordem que aparece na tela, em todas as paginas.
  var ITENS_MENU = [
    { rota: 'mural/',       icone: '🗓️', titulo: 'Mural',           exige: 'todos' },
    { rota: 'usuarios/',    icone: '👥', titulo: 'Participantes',   exige: 'coordenacao' },
    { rota: 'biblioteca/',  icone: '🎵', titulo: 'Biblioteca',      exige: 'midia-completo' },
    { rota: 'disparador/',  icone: '📲', titulo: 'Controle remoto', exige: 'midia-controle' },
    { rota: 'exibidor/',    icone: '🔊', titulo: 'Exibidor',        exige: 'midia-completo' },
    { rota: 'conta/',       icone: '👤', titulo: 'Minha conta',     exige: 'todos' }
  ];

  function ehCoordenacao(perfil) {
    return !!perfil && (perfil.papel === 'master' || perfil.papel === 'coordenador');
  }

  // Acesso a midia e concedido pessoa a pessoa, em niveis.
  // O master tem sempre completo, para nunca ficar trancado para fora.
  function nivelMidia(perfil) {
    if (!perfil) return 'nenhum';
    if (perfil.papel === 'master') return 'completo';
    return perfil.acesso_midia || 'nenhum';
  }

  function podeMidia(perfil, nivelPedido) {
    var nivel = nivelMidia(perfil);
    if (nivel === 'completo') return true;
    return nivel === 'controle' && nivelPedido === 'controle';
  }

  function podeVer(item, perfil) {
    if (item.exige === 'coordenacao') return ehCoordenacao(perfil);
    if (item.exige === 'midia-controle') return podeMidia(perfil, 'controle');
    if (item.exige === 'midia-completo') return podeMidia(perfil, 'completo');
    return true;
  }

  // usar nas paginas de midia no lugar do exigirAcesso por papel
  async function exigirMidia(nivelPedido) {
    var perfil = await exigirAcesso();
    if (!perfil) return null;
    if (!podeMidia(perfil, nivelPedido || 'completo')) {
      alert('Seu acesso não inclui esta área. Fale com a coordenação.');
      window.location.href = raizRelativa() + 'mural/';
      return null;
    }
    return perfil;
  }

  // destino: elemento ou id. rotaAtiva: ex 'mural/'
  function montarNav(destino, rotaAtiva, perfil) {
    var nav = typeof destino === 'string' ? document.getElementById(destino) : destino;
    if (!nav) return;
    nav.innerHTML = '';
    ITENS_MENU.forEach(function (i) {
      if (!podeVer(i, perfil)) return;
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
    exigirMidia: exigirMidia,
    ehCoordenacao: ehCoordenacao,
    podeMidia: podeMidia,
    nivelMidia: nivelMidia,
    montarNav: montarNav,
    logout: logout,
    normalizarUsuario: normalizarUsuario,
    emailDoUsuario: emailDoUsuario,
    publicUrlAudio: publicUrlAudio,
    publicUrlMaterial: publicUrlMaterial
  };
})();
