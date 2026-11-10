/* Seguridad/interfaz-segura.js · generado por separar-capas.js · el código está igual que en admin.html */
(function () {
  'use strict';
  var OK_IMG = /^(https:|data:image\/|blob:)/i;
  var SEL = 'iframe,frame,object,embed,applet,base,a,img,form,input';

  function uno(n) {
    if (!n || n.nodeType !== 1) return;
    var t = n.tagName;
    if (t === 'IFRAME' || t === 'FRAME' || t === 'OBJECT' || t === 'EMBED' || t === 'APPLET' || t === 'BASE') { n.remove(); return; }
    if (t === 'A') {
      var h = n.getAttribute('href') || '';
      if (/^\s*(javascript|data|vbscript):/i.test(h)) n.removeAttribute('href');
      if (n.target === '_blank') n.rel = 'noopener noreferrer';
      n.referrerPolicy = 'no-referrer';
    } else if (t === 'IMG') {
      var s = n.getAttribute('src');
      if (s) {
        var abs = null;
        try { abs = new URL(s, location.href); } catch (e) {}
        if (!abs || !(abs.origin === location.origin || OK_IMG.test(abs.href))) n.removeAttribute('src');
      }
      n.referrerPolicy = 'no-referrer';
    } else if (t === 'FORM') {
      var a = n.getAttribute('action');
      if (a) { try { if (new URL(a, location.href).origin !== location.origin) n.removeAttribute('action'); } catch (e) { n.removeAttribute('action'); } }
    } else if (t === 'INPUT') {
      if (n.type !== 'password' && n.getAttribute('autocomplete') !== 'off') n.setAttribute('autocomplete', 'off');
    }
  }
  function arbol(n) {
    uno(n);
    if (n && n.querySelectorAll) { var l = n.querySelectorAll(SEL); for (var i = 0; i < l.length; i++) uno(l[i]); }
  }

  arbol(document.documentElement);
  if (window.MutationObserver) {
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'attributes') { uno(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) arbol(m.addedNodes[j]);
      }
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'href', 'action'] });
  }

  /* Privacidad: al cambiar de app/pestaña el panel se desenfoca */
  document.addEventListener('visibilitychange', function () {
    document.documentElement.classList.toggle('sec-privado', document.hidden);
  });
})();
