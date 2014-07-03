"use strict"; // 本当はあんまり良くない、関数レベルで使うのが良い。

// start vue.js code

var memo = new Vue({
  el: 'body',

  data: {
    input: ''
  },

  filters: {
    createObjectURL: function( str ){
      var blob, url;
      if ( !str ) {
        return '';
      }
      return URL.createObjectURL(
        new Blob([str],{type:'text\/plain'})
      );
    },

    marked: marked
  },

  ready: function(){
    this.$el.querySelector('.input-area').focus();
  }
});
