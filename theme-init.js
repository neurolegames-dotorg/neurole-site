(function(){
  var theme;
  try{ theme = localStorage.getItem('neurole_theme'); }catch(e){}
  if(theme !== 'light' && theme !== 'dark'){
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;

  /* Arm the scroll reveal.

     This runs in <head> on purpose: the reveal's hidden state is gated on
     .reveal-ready, and adding it after first paint would let every card render
     and then snap out of view. Setting it here means they start hidden.

     Everything here is fail-open. The class is only added when the browser can
     actually drive the reveal, and the timer strips it again if script.js never
     arrives — a blocked or broken script leaves a fully readable page rather
     than a blank one. initScrollReveal() adds .reveal-running to claim it. */
  try{
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduce && 'IntersectionObserver' in window){
      var root = document.documentElement;
      root.classList.add('reveal-ready');
      window.setTimeout(function(){
        if(!root.classList.contains('reveal-running')){
          root.classList.remove('reveal-ready');
        }
      }, 4000);
    }
  }catch(e){}
})();
