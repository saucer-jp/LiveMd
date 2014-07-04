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

    marked: marked
  },

  ready: function(){
    this.$watch('input', this._watch);
    this.firstlineStr = this.getFirstlineStr();
    this.$el.querySelector('.input-area textarea').focus();
  },

  methods: {
    _watch: function(){
      this.firstlineStr = this.getFirstlineStr();
    },

    getFirstlineStr: function(){
      var regexp = {
        firstline: /.*/,
        mdSyntax: /^[#|\*]* */
      };
      var md = this.input;
      var firstline = md.match( regexp.firstline ).toString().trim();
      var optimized = firstline.replace( regexp.mdSyntax, '' );

      if( firstline === '' ){
        return 'new';
      } else {
        return optimized;
      }
    }
  }
});
