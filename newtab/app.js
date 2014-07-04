"use strict"; // 本当はあんまり良くない、関数レベルで使うのが良い。

// start vue.js code

var memo = new Vue({
  el: 'html',

  data: {
    input: '',
    firstlineStr: ''
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

    getFirstlineStr: function( str ){
      var regexp = {
        firstline: /.*/,
        mdSyntax: /^[#|\*]* */
      };
      var firstline = str.match( regexp.firstline ).toString().trim();
      var optimized = firstline.replace( regexp.mdSyntax, '' );

      if( firstline === '' ){
        return 'new';
      } else {
        return optimized;
      }
    },

    marked: marked
  },

  ready: function(){
  },

  methods: {
  }
});
