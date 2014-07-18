"use strict";
/* ----------
storageの構造
-------------
storage: {
  'storageVer': 'number',
  'currentID': 'number',
  'isMemoChangeOpened': 'bool',
  'isMemoRemoveOpened': 'bool',
  'memos': [{
    'title': 'str',
    'md': 'md0' // 実態のmdへのkey
  },{
    'title': 'str',
    'md': 'md1' // 実態のmdへのkey
  }],
  'md0': 'str', // mdの実態
  'md1': 'str', // mdの実態
}; */



var _const = {
  storageVer: '0.1',
  title: 'untitled',
  regexp: {
    firstline: /.*/,
    mdSyntax: /^[#|\*]* */, // TODO 削除するsyntaxを増やす
    removeBtn: /removeBtn/
  },
  selectors: {
    inputArea: '.input-area textarea'
  },
  prefixes: {
    md: 'md'
  },
  keys: {
    storageVer: 'storageVer',
    currentIndex: 'currentIndex',
    isMemoChangeOpened: 'isMemoChangeOpened',
    isMemoRemoveOpened: 'isMemoRemoveOpened',
    memos: 'memos'
  }
};



var app = new Vue({
  el: 'html',
  data: {
    _const: _const,
    isMemoChangeOpened: true,
    isMemoRemoveOpened: false,
    current: {
      index: 0,
      title: '',
      md: '',
      allLettersLength: 0,
      selectedLettersLength: 0
    },
    memos: [],
    $storage: window.localStorage
  },



  // Vue.jsの準備が完了してから動作させるもの
  ready: function(){
    this.init();
    this.watchChromeEvents();
    this.$watch( 'current.md', this.updatedMemo );
    this.$watch( 'isMemoChangeOpened', this.autoSave );
    this.$watch( 'isMemoRemoveOpened', this.autoSave );
  },



  filters: {

    // ダウンロード用のmdファイルを生成
    createObjectURL: function( str ){
      // TODO current.mdを監視して常に動いているので、click発火でいいかも
      if( !str ) return '';
      var blob = new Blob( [str], {type: 'text\/plain'} );
      var url = URL.createObjectURL( blob );
      return url;
    },



    // Markdown to html
    marked: marked
  },



  methods: {

    init: function(){
      // storageにデータがあったら持ってくる
      if( this.$storage.getItem( this._const.keys.storageVer ) ){
        this.syncStorage();

      // storageにバージョンがなかったら初期設定をする
      } else {
        // storageにバージョンを設置
        this.$storage.setItem( this._const.keys.storageVer, this._const.storageVer );

        // storageに初期メモを設置
        this.setMemo( this.memos );

        // 保存
        this.autoSave( this.current.index, true );
      }
    },



    // Chrome独自のイベントを監視
    watchChromeEvents: function(){

      // Chromeのタブ切り替えを監視
      var tabsChanged = chrome.tabs.onSelectionChanged
      tabsChanged.addListener(function(tabId, selectInfo){
        app.init();
      });

      // Chromeのウィンドウ切り替えを監視
      var winChanged = chrome.windows.onFocusChanged
      winChanged.addListener(function(windowId){
        app.init();
      });
    },



    // 通常のメモリストとメモ削除用のリストの切り替え
    toggleMenu: function( value ){
      if( value === 'change' ){
        this.isMemoChangeOpened = !this.isMemoChangeOpened;
        if( this.isMemoRemoveOpened ){
          this.isMemoRemoveOpened = !this.isMemoRemoveOpened;
        }
      }

      if( value === 'remove' ){
        this.isMemoRemoveOpened = !this.isMemoRemoveOpened;
        if( this.isMemoChangeOpened ){
          this.isMemoChangeOpened = !this.isMemoChangeOpened;
        }
      }
    },



    // メモの表示
    renderMemo: function( event ){
      var index;

      // 本来はeventだけとって判定したいのだけれど
      // 内部的にrenderが呼ばれる場合に
      // 引数にeventではなくindexが入るのでここで切り分け
      if( typeof event === 'number' ){
        index = event;

      // preventdefault的な方法で簡単にできなかったので
      // removeBtnからのバブリングをここで弾く
      } else {
        var removeBtn = this.$root.$data._const.regexp.removeBtn;
        var srcElement = event.srcElement.className;
        var clickedRemoveBtn = removeBtn.test( srcElement );
        if( clickedRemoveBtn ){
          return;

        // removeBtnから以外のクリックは通す
        } else {
          index = event.targetVM.$index;
        }
      }

      var memo = this.memos[ index ];
      var md = this.getMd( memo.md ) || '';
      var inputArea = this._const.selectors.inputArea;
      this.setIndex( index );
      this.setTitle( index, md );
      this.setMd( md );
      this.$el.querySelector( inputArea ).focus();
    },



    // リストから選択されたメモを削除する
    removeMemo: function( memo ){
      var data = memo.$root.$data;
      var thisIndex = memo.$index;
      var currentIndex = data.current.index;

      // 最後のメモは消さない
      if( data.memos.length === 1 ){
        return; // TODO 実際はなんか通知用関数を実行したい

      // 複数メモがあったら消す
      } else {
        this.$storage.removeItem( memo.$data.md );
        this.memos.$remove( memo.$data );

        // なおかつ、表示中のメモが消されたら
        if( thisIndex === currentIndex ){
          this.renderMemo( this.getNearIndex( thisIndex ) );
          return;
        }

        // 現在表示されているメモより小さいindex番号の
        // メモが削除された場合は表示中メモのindex番号がひとつ減る
        if ( thisIndex < currentIndex ){
          this.renderMemo( currentIndex - 1 );
          return;
        }

        if( thisIndex > currentIndex ){
          this.autoSave( currentIndex );
          return;
        }
      }
    },



    // 新しいメモ作る
    createMemo: function(){
      var index = this.memos.length;
      this.setMemo( this.memos );
      this.setIndex( index );
      this.renderMemo( index );
    },



    // 表示中のメモ内容が更新されたら
    updatedMemo: function(){
      var current = this.current;
      this.setTitle( current.index, current.md );
      this.setAllLettersLength( current.md );
      this.autoSave( current.index );
    },



    createNewMemo: function( memos ){
      var newMemo = {
        title: 'untitled',
        md: this.createNewMdKey( memos )
      };
      return newMemo;
    },



    // memosに設置されるmdkeyを発行する
    // 重複するkeyは発行しない
    createNewMdKey: function( memos ){
      var len = memos.length;
      var hasKey = false;
      var preMdKey = this.$root.$data._const.prefixes.md;
      var id = len;
      var mdKey = '';

      // memos配列を総当りして
      // 同じmdKeyが存在しているかを判定
      if( len === 0 ) return 'md0';
      while( !hasKey ){
        mdKey = preMdKey + id;
        for( var i = 0; i < len; i++ ){
          if( memos[ i ].md === mdKey ){
            hasKey = true;
          }
        }
        if( hasKey ){
          id++;
          hasKey = false;
        } else {
          return mdKey;
        }
      }
    },



    // 引数のindexに近い使用中indexを返す。
    // 表示中のメモを削除した場合に上か下のメモを表示するのに使用
    getNearIndex: function( index ){
      // TODO 未実装なので、とりあえず先頭を返す 2014/07/13
      return 0;
    },



    setTitle: function( index, md ){
      var title = this.getFirstlineStr( md );
      this.current.title = title;
      this.memos[ index ].title = title;
    },



    // Markdownの一行目を取得しつつ
    // Markdownのsyntaxを削除して返す
    getFirstlineStr: function( str ){
      if( str === '' ){
        return this._const.title;
      }
      var firstline = str
        .match( this._const.regexp.firstline )
        .toString()
        .trim();
      var optimized = firstline
        .replace( this._const.regexp.mdSyntax, '' );
      return optimized;
    },



    setIndex: function( index ){
      this.current.index = index;
    },



    setMemo: function( memos ){
      this.memos.push( this.createNewMemo( memos ) );
    },



    getMd: function( mdKey ){
      return JSON.parse( this.$storage.getItem( mdKey ) );
    },



    setMd: function( md ){
      this.current.md = md;
    },



    setSelectedLettersLength: function(){
      var str = window.getSelection().toString();
      this.$data.current.selectedLettersLength = this.getLettersLength( str );
    },



    setAllLettersLength: function( str ){
      this.current.allLettersLength = this.getLettersLength( str );
    },



    // 引数文字列をMarkdownのシンタックスを
    // 取り除いたうえでカウントして返す
    getLettersLength: function( str ){
      var _str = str;
      // TODO _const.regexpに移動する
      _str = _str.replace(/(^|\n)#{1,6}/g, '\n'); // heading
      _str = _str.replace(/(^|\n)(=|-){2,}\n/g, '\n'); // heading
      _str = _str.replace(/(^|\n) *(-|\*)/g, '\n'); // list
      _str = _str.replace(/(^|\n)(\*|`){3,}/g, '\n'); // hr & block code
      _str = _str.replace(/(^|\n)>/g, '\n'); //blockquote
      _str = _str.replace(/`(.*)`/g, '$1'); // inline code
      _str = _str.replace(/~{2}(.*)~{2}/g, '$1'); // del
      _str = _str.replace(/\*+(.*)\*+/g, '$1'); // bold
      _str = _str.replace(/\!?\[(.*)\](.*)/g, '$1'); // link
      _str = _str.replace(/(\|:?--:?)+/g, '\n'); // table
      _str = _str.replace(/\s/g, ''); // space
      return _str.length;
    },



    // storageへ自動セーブ
    // 第一引数がindex, 第二引数がtrueだった場合はすべての情報を保存
    // 第一引数のみだった場合は保存される情報が振り分けられる
    autoSave: function( index, allSave ){
      var keys = this.$root.$data._const.keys;

      // 引数がbool値だったら表示の切替情報のみ保存
      if( typeof index === 'boolean' || allSave === true ){
        var isMemoChangeOpened = this.$root.$data.isMemoChangeOpened;
        var isMemoRemoveOpened = this.$root.$data.isMemoRemoveOpened;
        this.$storage.setItem( keys.isMemoChangeOpened, JSON.stringify( isMemoChangeOpened ) );
        this.$storage.setItem( keys.isMemoRemoveOpened, JSON.stringify( isMemoRemoveOpened ) );
      }

      // 引数がnumberだった場合はメモ関連を保存
      if ( typeof index === 'number' || allSave === true ){
        var memos = this.$root.$data.memos;
        var md = this.$root.$data.current.md;
        this.$storage.setItem( keys.currentIndex, index );
        this.$storage.setItem( keys.memos, JSON.stringify( memos ) );
        this.$storage.setItem( this.memos[ index ].md, JSON.stringify( md ) );
      }
    },



    // localStorageとの同期
    // localstorageからデータを引っ張ってきてメモリ上に配置
    syncStorage: function(){
      var data = this.$root.$data;
      var keys = data._const.keys;
      data.isMemoChangeOpened = JSON.parse( this.$storage.getItem( keys.isMemoChangeOpened ) );
      data.isMemoRemoveOpened = JSON.parse( this.$storage.getItem( keys.isMemoRemoveOpened ) );
      data.current.index = JSON.parse( this.$storage.getItem( keys.currentIndex ));
      data.memos = JSON.parse( this.$storage.getItem( keys.memos ) );
      data.current.md = JSON.parse( this.$storage.getItem( data.memos[ data.current.index ].md ) );
    }
  }
});
