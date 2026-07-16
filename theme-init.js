(function(){
  var theme;
  try{ theme = localStorage.getItem('neurole_theme'); }catch(e){}
  if(theme !== 'light' && theme !== 'dark'){
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
})();
