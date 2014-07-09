"use strict";

var storage = window.localStorage;

/* ----------
storageの構造
-------------
storage: {
  'currentID': '0',
  'isMemoChangeOpened': 'true',
  'isMemoRemoveOpened': 'false',
  'titles': {
    '0': {
      'id': '0',
      'title': 'str'
    },
    '1': {
      'id': 1,
      'title': 'str'
    }
  },
  'md0': '',
  'md1': '',
}; */

var _const = {
  storageVer: '0.1',
  id: 0,
  title: 'untitled',
  md: '',
  regexp: {
    firstline: /.*/,
    mdSyntax: /^[#|\*]* */ // TODO 削除するsyntaxを増やす
  },
  selector: {
    inputArea: '.input-area textarea'
  },
  prefixes: {
    md: 'md'
  },
  keys: {
    storageVer: 'storageVer',
    currentID: 'currentID',
    isMemoChangeOpened: 'isMemoChangeOpened',
    isMemoRemoveOpened: 'isMemoRemoveOpened',
    titles: 'titles'
    // 各titleとmdのkeyについては
    // 動的に生成され以下に格納されている
    // data.indexes[ id ].title
    // data.indexes[ id ].md
  }
};

var app = new Vue({

  el: 'html',
  data: {
    _const: _const,
    isMemoChangeOpened: true,
    isMemoRemoveOpened: false,
    current: {
      id: 0,
      title: '',
      md: ''
    },
    titles: {}
  },


  // Vue.jsがDirectivesを作る前に動作させるもの
  created: function(){
    this.init();
    this.watchChromeEvents();
  },


  // Vue.jsの準備が完了してから動作させるもの
  ready: function(){
    this.$watch( 'current.md', this.memoChanged );
    this.$watch( 'isMemoChangeOpened', this.autoSave );
    this.$watch( 'isMemoRemoveOpened', this.autoSave );
    this.$watch( 'current', this.autoSave ); // TODO こいつは3回走ってしまうのでなんとかしたい
    this.$watch( 'indexes', this.autoSave );
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

//    memo: { // controller的な

      // ===================
      // メモの表示
      // ===================
      memoRender: function( id ){
        var inputArea = this._const.selector.inputArea;
        this.setID( id );
        this.setTitle( id );
        this.setMD( id );
        this.$el.querySelector( inputArea ).focus();
        //this.autoSave( id );
      },

      // ===================
      // リストから選択されたメモを削除する
      // ===================
      memoRemove: function( id ){
        // 最後のメモは消さない
        if( getIndexesCount() === 1 ){
          return; // TODO 実際はなんか通知用関数を実行したい

        // 複数メモがあったら消す
        } else {
          this.deleteIndex( id );
          // TODO ↓こいつをautoSave()だけで終わらせたい
          storage.removeItem( this.getMdKey( id ) ); // storageのメモも消す
          storage.removeItem( this.getTitleKey( id ) ); // storageのタイトルも消す

          // なおかつ、表示中のメモが消されたら
          if( this.current.id === id ){
            this.memoRender( this.getNearID( id ) );
          }
        }
        //this.autoSave( id );
      },

      // ===================
      // 新しいメモ作る
      // ===================
      memoCreate: function(){
        var newID = this.getNewID();
        var newMemo = getNewMemoObj( newID );
        this.setIndex( newID, newMemo );
        this.memoRender( newID );
        //this.autoSave( id );
      },

      // ===================
      // 表示中のメモが変更されたら
      // ===================
      memoChanged: function(){
        this.setTitle( this.current.id );
        //this.autoSave();
      },
    //},



    // 未使用のIDを探して返す
    getNewID: function(){
      var id = Object.keys( this.indexes ).length;
      var hasID = this.titles.hasOwnProperty( id );
      while( hasID ){
        hasID = this.titles.hasOwnProperty( ++id );
      }
      return id;
    },

    // 引数のIDに近い使用中IDを返す。
    // 表示中のメモを削除した場合に上か下のメモを表示するのに使用
    getNearID: function( id ){
      // TODO 未実装なので、とりあえず先頭のIDを返す 2014/07/07
      return Object.keys( this.indexes ).shift();
    },

    getNewMemoObj: function( id ){
      return {
        id: id,
        title: this._const.title,
        md: this._const.md
      };
    },

    getIndexesCount: function(){
      return Object.keys( this.indexes ).length;
    },

    getMdKey: function( id ){
      var prefix = this._const.prefixes.md;
      return prefix + id;
    },

    getTitleKey: function( id ){
      var prefix = this._const.prefixes.title;
      return prefix + id;
    },

    setID: function( id ){
      this.current.id = this.id;
    },

    setTitle: function( id ){
      var key = this.getMdKey( id );
      console.log( key );
      var md = storage.getItem( key );
      this.current.title = this.getFirstlineStr( md );
    },

    setMD: function( id ){
      var key = this.getMdKey( id );
      var md = storage.getItem( key );
      if( md === null ){
        this.current.md = this._const.md;
      } else {
        this.current.md = md;
      }
    },

    setIndex: function( key, val ){
      // Vue.jsのdata binding的な都合で
      // 一旦indexesをまるっと変数に入れて戻してる。
      // なんかそうしないとbindingされない。困った。
      var indexes = this.indexes;
      indexes[ key ] = val;
      this.indexes = indexes;
    },

    deleteIndex: function( key ){
      // Vue.jsのdata binding的な都合で
      // 一旦indexesをまるっと変数に入れて戻してる。
      // なんかそうしないとbindingされない。困った。
      var indexes = this.indexes;
      delete indexes[ key ];
      this.indexes = indexes;
    },





    // -----------------------------------------------------


    // Chrome独自のイベントを監視
    watchChromeEvents: function(){

      // Chromeのタブ切り替えを監視
      var tabsChanged = chrome.tabs.onSelectionChanged
      tabsChanged.addListener(function(tabId, selectInfo){
        // TODO storageとtitlesの同期だけして、現在のIDをrennderしたい
        // app.syncStorage( true ) とかそんな感じ？
        app.syncStorage();
      });

      // Chromeのウィンドウ切り替えを監視
      var winChanged = chrome.windows.onFocusChanged
      winChanged.addListener(function(windowId){
        // TODO storageとtitlesの同期だけして、現在のIDをrennderしたい
        // app.syncStorage( true ) とかそんな感じ？
        app.syncStorage();
      });
    },

    // 通常のMemolistsとメモ削除用のlistsの切り替え
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
      this.autoSave();
    },

    // Markdownの一行目を取得しつつMarkdownのsyntaxを削除して返す
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


    // リストから選択されたメモを表示する
    //renderMemo: function( id ){
    //  var key = 'md' + id;
    //  var md = storage.getItem( key );

    //  if( md === null ){
    //    this.current.md = '';
    //  } else {
    //    this.current.md = md;
    //  }
    //  this.current.id = id;
    //  this.current.title = this.titles[ id ].title; // TODO ここ

    //  this.$el.querySelector( this._const.selector.inputArea ).focus();
    //},


    // storageへ自動セーブ
    autoSave: function(){
      var id = this.current.id;
      var keys = this._const.keys;

      storage.setItem( keys.currentID, id );
      storage.setItem( keys.isMemoChangeOpened, this.isMemoChangeOpened );
      storage.setItem( keys.isMemoRemoveOpened, this.isMemoRemoveOpened );
      storage.setItem( keys.indexes, JSON.stringify( this.indexes ) );
      //storage.setItem( this.indexes[ id ].title, this.current.title );
      storage.setItem( this.indexes[ id ].md, this.current.md );

      // TODO 'md0'とか'title0'とかもautoSave時に削除したい
      // if(
      //   メモリ上のindexesにあってstorageのindexesにないidがあったら
      //   storageの'md0'なり'title0'なりを消す
      // ){ code };
    },

    // localStorageとの同期
    syncStorage: function(){

      if( storage.getItem( this._const.keys.ver ) === null ) return;

      // Vue.jsのdata binding的な都合で
      // 一旦indexesをまるっと変数に入れて戻してる。
      // なんかそうしないとbindingされない。困った。
      var indexes = this.indexes;
      indexes = this.replaceIndexesFromStorage( indexes );
      this.indexes = indexes;

      // 各種設定の読み込み
      var keys = _const.keys;
      this.isMemoChangeOpened = JSON.parse( storage.getItem( keys.isMemoChangeOpened ));
      this.isMemoRemoveOpened = JSON.parse( storage.getItem( keys.isMemoRemoveOpened ));
      this.current.id = JSON.parse( storage.getItem( keys.currentID ));
      this.current.md = JSON.parse( storage.getItem( getMdKey( this.current.id )));
    },

    // メモリ上のindexesをstorage上のindexesに置き換える
    replaceIndexesFromStorage: function( indexes ){
      // メモリ上のtitlesの中身をすべて消す
      var keys = Object.keys( indexes );
      var length = keys.length;
      while( length ){
        --length;
        delete indexes[ keys[ length ] ];
      }

      // storage上のtitlesの中身をすべて入れ込む
      var newIndexes = JSON.parse( storage.getItem( _const.keys.indexes ));
      var newKeys = Object.keys( newIndexes );
      var newLength = newKeys.length;
      while( newLength ){
        --newLength;
        indexes[ newKeys[ newLength ] ] = newIndexes[ newKeys[ newLength] ];
      }
    },


    init: function(){


      storage.clear();


      // storageにデータがあったら持ってくる
      if( storage.getItem( this._const.keys.ver ) ){
        this.syncStorage();

      // storageにデータがなかったら初期設定をする
      } else {
        // storageにバージョンを設置
        // storageに初期メモを設置


        // つくるのは
        // current.id, current.title, current.md
        storage.setItem( this._const.keys.ver, this._const.ver );
        this.indexes[ _const.id ] = _const.initialIndex;
        this.autoSave();
      }
    }
  }
});
