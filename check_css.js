fetch('http://localhost:3000/login')
  .then(r => r.text())
  .then(html => {
    const matches = [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)];
    if (matches.length > 0) {
      matches.forEach(m => {
        let cssUrl = m[1];
        if (cssUrl.startsWith('/_next')) {
          cssUrl = 'http://localhost:3000' + cssUrl;
        }
        fetch(cssUrl).then(r => r.text()).then(css => {
          console.log('CSS URL:', cssUrl);
          console.log('Contains bg-primary-600:', css.includes('bg-primary-600'));
          if (css.includes('bg-primary-600')) {
             const idx = css.indexOf('bg-primary-600');
             console.log(css.substring(Math.max(0, idx - 50), idx + 50));
          }
        });
      });
    }
  });
