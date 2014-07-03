"use strict"; // 本当はあんまり良くない、関数レベルで使うのが良い。

// start vue.js code

var memo = new Vue({
  el: 'html',

  data: {
    input: '',
    firstLineStr: ''
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
    this.firstLineStr = this.getFirstLineStr();
    this.$el.querySelector('.input-area textarea').focus();
  },

  methods: {
    _watch: function(){
      this.firstLineStr = this.getFirstLineStr();
    },
    getFirstLineStr: function(){
      var firstLine = this.input.match(/.*/).toString().trim();
      if( firstLine === '' ){
        return 'new';
      } else {
        return firstLine;
      }
    }
  }
});
