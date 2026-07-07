export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/combine') {
      const urls = url.searchParams.getAll('url');
      if (urls.length === 0) return new Response('Need url param', { status: 400 });
      const include = (url.searchParams.get('include')||'').split(',').map(s=>s.trim()).filter(Boolean);
      const exclude = (url.searchParams.get('exclude')||'').split(',').map(s=>s.trim()).filter(Boolean);
      const dedup = url.searchParams.get('dedup') !== 'false';
      const results = await Promise.allSettled(urls.map(async u => {
        if (!u.startsWith('http')) return '';
        const r = await fetch(u);
        if (!r.ok) return '';
        let t = (await r.text()).trim();
        try { t = atob(t); } catch {}
        return t;
      }));
      const proxies = [];
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        for (const line of r.value.split(String.fromCharCode(10))) {
          const t = line.trim();
          if (!t || t.startsWith('#') || t.startsWith('//')) continue;
          let name = '';
          const h = t.indexOf('#');
          if (h > 0) name = decodeURIComponent(t.substring(h + 1));
          if (!['ss://','ssr://','vmess://','trojan://','vless://','hysteria2://','hy2://','tuic://'].some(p => t.startsWith(p))) continue;
          if (include.length && !include.some(k => (name||t).toLowerCase().includes(k.toLowerCase()))) continue;
          if (exclude.length && exclude.some(k => (name||t).toLowerCase().includes(k.toLowerCase()))) continue;
          if (dedup && proxies.some(p => p.uri === (h > 0 ? t.substring(0, h) : t))) continue;
          proxies.push({ uri: h > 0 ? t.substring(0, h) : t, name });
        }
      }
      const output = proxies.map(p => p.uri + (p.name ? '#' + encodeURIComponent(p.name) : '')).join(String.fromCharCode(10));
      return new Response(btoa(output), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }
      });
    }
    return new Response('Sub-Store Worker\nUsage: /combine?url=SUB1&url=SUB2');
  }
};