"use strict";

var storage = window.localStorage;

/*
-------------
storageの構造
-------------
storage: {
  currentID: 0,
  titles: {
    '0': {
      id: 0,
      title: ''
    },
    '1': {
      id: 1,
      title: ''
    },
    {...}
  },
  md0: '',
  md1: '',
  ...
}
*/

var app = new Vue({

  el: 'html',

  data: {
    defID: 0,
    defTitle: 'untitled',
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
    this.syncStorage();
    this.chromeEvents();
  },

  // Vue.jsの準備が完了してから動作させるもの
  ready: function(){
    this.$watch( 'current.md', this.createTitle )
    this.$watch( 'current.md', this.autoSave );
  },

  filters: {

    // ダウンロード用のmdファイルを生成
    // current.mdを監視して常に動いているので、click発火でいいかも
    createObjectURL: function( str ){
      if( !str ) return '';
      var blob = new Blob( [str], {type: 'text\/plain'} );
      var url = URL.createObjectURL( blob );
      return url;
    },

    // Markdown to html
    marked: marked
  },

  methods: {

    chromeEvents: function(){

      // chrome tabs on selection changed
      // Chromeのタブ切り替えで動作
      var tabsChanged = chrome.tabs.onSelectionChanged
      tabsChanged.addListener(function(tabId, selectInfo){
        // TODO storageとtitlesの同期だけして、現在のIDをrennderしたい
        // app.syncStorage( true ) とかそんな感じ？
        app.syncStorage();
      });

      // chrome windows on focus changed
      // Chromeのウィンドウ切り替えで動作
      var winChanged = chrome.windows.onFocusChanged
      winChanged.addListener(function(windowId){
        // TODO storageとtitlesの同期だけして、現在のIDをrennderしたい
        // app.syncStorage( true ) とかそんな感じ？
        app.syncStorage();
      });
    },

    // 通常のMemolistsとメモ削除用のlistsの切り替え
    toggleMenu: function( value ){
      var change = this.isMemoChangeOpened;
      var remove = this.isMemoRemoveOpened;

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

    // 入力されたMarkdownからメモのタイトルを作成して差し替え
    createTitle: function(){
      var title = this.getFirstlineStr( this.current.md );
      this.current.title = title;
      this.titles[ this.current.id ].title = title;
    },

    // Markdownの一行目を取得しつつMarkdownのsyntaxを削除して返す
    getFirstlineStr: function( str ){
      var regexp = {
        firstline: /.*/,
        mdSyntax: /^[#|\*]* */ // TODO 削除するsyntaxを増やす
      };
      var firstline = str.match( regexp.firstline ).toString().trim();
      var optimized = firstline.replace( regexp.mdSyntax, '' );

      // Markdownが空だったらデフォルトのファイル名を返す
      if( firstline === '' ){
        return this.defTitle;
      } else {
        return optimized;
      }
    },

    // 新しいメモを作る
    createNewMemo: function(){
      var id = this.createNewID();
      var titles = this.titles;
      // TODO ここにメモの型があるのが微妙な気がするので外出ししたい
      titles[ +id ] = {
        id: id,
        title: this.defTitle
      };
      this.titles = titles;
      this.renderMemo( id );
    },

    // 重複しない新しいIDを作って返す
    createNewID: function(){
      var id = Object.keys( this.titles ).length;
      var hasID = this.titles.hasOwnProperty( id );
      while( hasID ){
        hasID = this.titles.hasOwnProperty( ++id );
      }
      return id;
    },

    // 引数のIDに近い存在するIDを返す
    // 主にcurrentのメモをremoveMemo()した後に
    // 次に表示するメモを決定するために使用
    nextToID: function( id ){
      // TODO 未実装 2014/07/07
      // とりあえず先頭のメモIDを返す
      return Object.keys( this.titles ).shift();
    },

    // リストから選択されたメモを表示する
    renderMemo: function( id ){
      var key = 'md' + id;
      var md = storage.getItem( key );

      if( md === null ){
        this.current.md = '';
      } else {
        this.current.md = md;
      }
      this.current.id = id;
      this.current.title = this.titles[ id ].title;

      this.$el.querySelector('.input-area textarea').focus();
    },

    // リストから選択されたメモを削除する
    removeMemo: function( id ){

      // 最後の一個は消さない
      var memoCount = Object.keys( this.titles ).length;
      if( memoCount === 1 ){
        return;

      // 最後の一個じゃなかったらメモを消す
      } else {
        var titles = this.titles;
        delete titles[ id ]; // リストから該当メモを消す
        this.titles = titles; // titlesを入れ替えないと$watchが発火しないため
        storage.removeItem( 'md' + id ); // 保存してあるメモ本体も消す

        // 表示中のメモを消したら別のメモを表示する
        if( this.current.id === id ){
          this.renderMemo( this.nextToID( id ) ); // 消したメモIDに近いIDを表示
        }

        this.autoSave();
      }
    },

    // storageへ自動セーブ
    autoSave: function(){
      var id = this.current.id;
      var keys = {
        currentID: 'currentID',
        md: 'md' + id,
        titles: 'titles',
        isMemoChangeOpened: 'isMemoChangeOpened',
        isMemoRemoveOpened: 'isMemoRemoveOpened'
      };
      storage.setItem( keys.currentID, id );
      storage.setItem( keys.titles, JSON.stringify( this.titles ) );
      storage.setItem( keys.md, this.current.md);
      storage.setItem( keys.isMemoChangeOpened, this.isMemoChangeOpened );
      storage.setItem( keys.isMemoRemoveOpened, this.isMemoRemoveOpened );
    },

    // localStorageとの同期
    syncStorage: function(){

      // storageにデータがあったら持ってくる
      if( storage.getItem( 'titles' ) ){

        // 下記のやり方で普通にまるごと入れ替えたらVue.jsがうまく動作しなかった
        //this.titles = JSON.parse( storage.getItem( 'titles' ) );
        // なので、titlesオブジェクトは残しつつ、中身を総入れ替えすることにした

        var titles = this.titles;

        // メモリ上のtitlesの中身をすべて消す
        var keys = Object.keys( titles );
        var length = keys.length;
        while( length ){
          --length;
          delete titles[ keys[ length ] ];
        }

        // storage上のtitlesの中身をすべて入れ込む
        var _titles = JSON.parse( storage.getItem( 'titles' ));
        var _keys = Object.keys( _titles );
        var _length = _keys.length;
        while( _length ){
          --_length;
          titles[ _keys[ _length ] ] = _titles[ _keys[ _length ] ];
        }

        // 入れ替えたtitlesを戻す
        this.titles = titles;

        // 各種設定の読み込み
        this.current.id = storage.getItem( 'currentID' );
        this.current.md = storage.getItem( 'md' + this.current.id );
        this.isMemoChangeOpened = JSON.parse( storage.getItem( 'isMemoChangeOpened' ));
        this.isMemoRemoveOpened = JSON.parse( storage.getItem( 'isMemoRemoveOpened' ));

      // storageにデータがなかったら初期設定をする
      } else {
        var id = this.defID;
        var title = {
          id: id,
          title: this.defTitle
        };
        this.titles[ +id ] = title;
      }
    }
  }
});
