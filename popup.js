window.onload = function() {
  var fileName = 'newtab/index.html'
  var url = chrome.extension.getURL( fileName );
  chrome.tabs.create({
    url: url
  });
};
