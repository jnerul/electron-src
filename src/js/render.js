var { remote } = require('electron');

function zalert(text, callback) {
    // remote.dialog.showErrorBox('An Error Message', text);
    remote.dialog.showMessageBox({
        type: 'none', //“none”, “info”, “error”, “question” 或者 “warning”。
        title: 'ZPert',
        message: text,
        // buttons: ['确定', '取消'],
    }).then(result => {
        console.log(result)
        console.log('点击', result.response);
        if (callback != undefined)
            callback();
    }).catch(err => {
        console.log(err)
    })
}

var openZpertFile = undefined;
var saveZpertFile = undefined;
var newZpertFile = undefined;
function initwasm() {
    var images = new Array();
    var cc = new Image();
    cc.src = 'resource/icon.png';
    images[0] = cc;
    var view = undefined;
    var is_read_only = false;
    function autosizeCanvas() {
        var diff_height = document.getElementById('app_menu').clientHeight + 20;
        document.getElementById('zweb_view').width = document.documentElement.clientWidth - 20;
        document.getElementById('zweb_view').height = document.documentElement.clientHeight - diff_height;
        if (view) {
            view.SetDrawSize(document.documentElement.clientWidth - 20,
                document.documentElement.clientHeight - diff_height);
            view.Draw();
        }
    }
    ZWebViewInit({
        locateFile: function (file) {
            // console.log(__dirname);
            console.log('wasm dir:', 'js/' + file)
            return 'js/' + file
        },
        canvas: document.getElementById('zweb_view'),
        getImage: function (idx) {
            // console.log('getimage', idx);
            return images[idx];
        },
        initImage: function (str, idx) {
            // console.log('initimage');
            var imgstr = "data:image/png;base64," + str;
            cc = new Image();
            cc.src = imgstr;
            images[idx] = cc;
        },
        clearImage: function () {
            images = [];
        },
        messageBox: function (text, type) {
            console.log('mes:', text);
            if (type == 0) {
                zalert(text);
                return 1;
            } else if (type == 1) {
                if (confirm(text))
                    return 1;
                else
                    return 2;
            }
        },
        getResPath: function () {
            return "resource";
        },
        OnReceiveCoEditMessage: function (blob) {
            b = blob;
            console.log('receive', blob);
            // sendtocoeditclient(view, blob);
        },
        OnJoinCoEditCallBack: function (result) {
            console.log('joincoeditcallback', result)
        },
    }).then(function (Module) {
        // sendtocoeditclient = Module['sendtocoeditclient'];
        autosizeCanvas();
        function opendata(data) {
            view = Module.load(data, 3);
            view.SetReadOnly(false);
            document.getElementById('readonly').style.background = "#e0e0e0";
            is_read_only = false;
            // view.ResDbFromJSON(JSON.stringify(resdb));
            view.Draw();
        }

        openZpertFile = function openFile(filepath) {
            var fs = require("fs");
            fs.readFile(filepath, "utf8", (err, data) => {
                if (err) {
                    console.log('打开失败');
                } else {
                    opendata(data);
                }
            })
        }

        saveZpertFile = function (filepath) {
            var fs = require("fs");
            fs.writeFile(filepath, view.ToJson(), { encoding: 'utf8' }, function (err) {
                if (err)
                    throw err;
                console.log('保存成功');
            })
        }

        newZpertFile = function(){
            var doc = new Module.ZWebDoc();
            doc.InitNewDoc();
            Module.doc = doc;
            
            var zwebview = new Module.ZWebView(doc);
            Module.view = zwebview;
            Module.need_draw = false;
            var rect = document.getElementById('zweb_view').getBoundingClientRect();
            zwebview.SetDrawSize(rect.width, rect.height);
            zwebview.CalcDrawPos();
            zwebview.FitPage();
            zwebview.Draw();
            zwebview.SetReadOnly(false);
            view = zwebview;
        }

        // function ReadStr(e) {
        //     const file = e.target.files[0];
        //     if (!file) {
        //         return;
        //     }
        //     const reader = new FileReader();
        //     reader.onload = function (e) {
        //         console.log('openfile', file);
        //         var json = '';
        //         json += reader.result;
        //         // console.log(json);

        //         view = Module.load(json, 3);
        //         view.ResDbFromJSON(JSON.stringify(resdb));
        //         view.Draw();
        //     };
        //     reader.readAsText(file);

        // }
        console.log(__dirname);
        var pro = require("./js/temp");
        console.log(pro);
        opendata(JSON.stringify(pro.pro()));

        document.onkeydown = function (event) {
            var e = event || window.event || arguments.callee.caller.arguments[0];
            if (e) {
                view.OnMessage(Module.ZWM_KEYDOWN, e.keyCode, 0, 0, 0);
            }
        }
        document.onkeyup = function (event) {
            var e = event || window.event || arguments.callee.caller.arguments[0];
            if (e) {
                view.OnMessage(Module.ZWM_KEYUP, e.keyCode, 0, 0, 0);
            }
        }

        function dbclick(event) {
            console.log('dbclick');
        }
        document.addEventListener('ondblclick', function (e) {
            dbclick(e);
        });

        function drap(obj) {

            function start(event) {
                // 鼠标左键
                if (event.button == 0) {
                    var rect = document.getElementById("zweb_view").getBoundingClientRect();
                    var parent = document.getElementById("zweb_view").parentElement.parentElement;
                    // console.log(event.pageX - rect.left - window.pageXOffset, event.pageY - rect.top - window.pageYOffset);
                    view.OnMessage(Module.ZWM_LBUTTONDOWN, event.pageX - rect.left - window.pageXOffset,
                        event.pageY - rect.top - window.pageYOffset, 0, 0);
                    // 绑定事件，同样unbind解绑定，此效果的实现最后必须要解绑定，否则鼠标松开后拖拽效果依然存在
                    //movemove事件必须绑定到$(document)上，鼠标移动是在整个屏幕上的
                    document.addEventListener('mousemove', move);
                    //此处的$(document)可以改为obj
                    document.addEventListener('mouseup', stop);
                    // window.open('tree.html')
                }
                return false; //阻止默认事件或冒泡
            }

            function move(event) {
                var rect = document.getElementById("zweb_view").getBoundingClientRect();
                var parent = document.getElementById("zweb_view").parentElement.parentElement;
                view.OnMessage(Module.ZWM_MOUSEMOVE, event.pageX - rect.left - window.pageXOffset, event
                    .pageY - rect.top - window.pageYOffset, 0, 0);
                return false; //阻止默认事件或冒泡
            }

            function stop(event) {
                // console.log('lup');
                var rect = document.getElementById("zweb_view").getBoundingClientRect();
                var parent = document.getElementById("zweb_view").parentElement.parentElement;
                view.OnMessage(Module.ZWM_LBUTTONUP, event.pageX - rect.left - window.pageXOffset, event
                    .pageY - rect.top - window.pageYOffset, 0, 0);
            }

            obj.addEventListener('mousedown', start);
            obj.addEventListener('mousemove', move);
            obj.addEventListener('mouseup', stop);

            function onTouchStart(event) {
                event.preventDefault();
                var offsetX = event.pageX;
                var offsetY = event.pageY;
                var touch = event.touches[0];
                var rect = document.getElementById("zweb_view").getBoundingClientRect();
                var parent = document.getElementById("zweb_view").parentElement.parentElement;
                // console.log('touchstart', touch.pageX - rect.left - window.pageXOffset,
                // touch.pageY - rect.top - window.pageYOffset);
                view.OnMessage(Module.ZWM_LBUTTONDOWN, touch.pageX - rect.left - window.pageXOffset,
                    touch.pageY - rect.top - window.pageYOffset, 0, 0);
            }

            function onTouchMove(event) {
                event.preventDefault();
                // console.log('touchmove');
                var touch = event.touches[0];
                var rect = document.getElementById("zweb_view").getBoundingClientRect();
                var parent = document.getElementById("zweb_view").parentElement.parentElement;
                view.OnMessage(Module.ZWM_MOUSEMOVE, touch.pageX - rect.left - window.pageXOffset, touch
                    .pageY - rect.top - window.pageYOffset, 0, 0);
                return false; //阻止默认事件或冒泡
            }

            function onTouchend(event) {
                event.preventDefault();
                // console.log('touchend');
                var touch = event.touches[0];
                var rect = document.getElementById("zweb_view").getBoundingClientRect();
                var parent = document.getElementById("zweb_view").parentElement.parentElement;
                view.OnMessage(Module.ZWM_LBUTTONUP, 0, 0, 0, 0);
            }
            obj.addEventListener('touchstart', onTouchStart, false);
            obj.addEventListener('touchmove', onTouchMove, false);
            obj.addEventListener('touchend', onTouchend, false);
        }
        var obj = document.getElementById('zweb_view');
        drap(obj);

        function gradeChange() {
            var obj = document.getElementById("grade");
            var grade = obj.options[obj.selectedIndex].value;
            if (grade == "层级1") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_1);
            } else if (grade == "层级2") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_2);
            } else if (grade == "层级3") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_3);
            } else if (grade == "层级4") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_4);
            } else if (grade == "层级5") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_5);
            } else if (grade == "层级6") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_6);
            } else if (grade == "层级7") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_7);
            } else if (grade == "层级8") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_8);
            } else if (grade == "层级9") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_9);
            } else if (grade == "全部展开") {
                view.OnCollapsed(Module.ID_BUTTON_EXPAND_ALL);
            }
        }
        document.getElementById('expand').addEventListener('click', function () {
            view.OnCollapsed(Module.ID_BUTTON_EXPAND);
        });
        document.getElementById('grade').addEventListener('change', gradeChange);

        function onPertModeChange() {
            var obj = document.getElementById("pertmode");
            var grade = obj.options[obj.selectedIndex].value;
            if (grade == "甘特图") {
                view.OnChangePertMode(Module.ID_VIEW_PERT_GANTT);
            } else if (grade == "网络图") {
                view.OnChangePertMode(Module.ID_VIEW_PERT_TIME);
            }
        }
        document.getElementById('pertmode').addEventListener('change', onPertModeChange);

        // document.getElementById('file-input').addEventListener('change', ReadStr);
        // document.getElementById('drawdoc').addEventListener('click', drawdoc);

        document.getElementById('OnSetPlanShow').addEventListener('click', function () {
            view.OnSetPlanShow();
        });
        document.getElementById('OnShowFinishRatio').addEventListener('click', function () {
            view.OnShowFinishRatio();
        });
        document.getElementById('goin').addEventListener('click', function () {
            view.OnGoIn();
        });
        document.getElementById('goout').addEventListener('click', function () {
            view.OnGoOut();
        });
        document.getElementById('readonly').style.background = "#e0e0e0";
        document.getElementById('readonly').addEventListener('click', function () {
            if (!is_read_only) {
                is_read_only = true;
                view.SetReadOnly(true);
                this.style.background = "#FFEB3B";
            } else {
                this.style.background = "#e0e0e0";
                is_read_only = false;
                view.SetReadOnly(false);
            }
        });

        document.getElementById('zweb_view').addEventListener('mousewheel', function (e) {
            var direct = 0;
            e = e || window.event;
            if (e.wheelDelta) { //IE/Opera/Chrome
                direct = e.wheelDelta / 120;
            } else if (e.detail) { //Firefox
                direct = -e.wheelDelta / 3;
            }
            var rect = document.getElementById("zweb_view").getBoundingClientRect()
            var parent = document.getElementById("zweb_view").parentElement.parentElement;
            var offsetX = event.pageX - rect.x - window.pageXOffset;
            var offsetY = event.pageY - rect.y - window.pageYOffset;
            if (direct > 0)
                direct = 2;
            else
                direct = 0.5;
            view.OnMessage(Module.ZWM_MOUSEWHEEL, offsetX, offsetY, direct, 0);
            return false;
        });
    });
    window.onresize = function () {
        autosizeCanvas();
    }
}

function openFile(filepath) {
    if (openZpertFile != undefined)
        openZpertFile(filepath);
}

function saveFile(filepath) {
    if (saveZpertFile != undefined) {
        saveZpertFile(filepath);
    }
}

function newFile() {
    if (newZpertFile != undefined) {
        newZpertFile();
    }
}

(function initMenu() {
    var Menu = require('electron').remote.Menu;
    const isMac = process.platform === 'darwin'

    const template = [
        // { role: 'appMenu' }
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideothers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        // { role: 'fileMenu' }
        {
            label: '文件',
            submenu: [
                {
                    label: '新建',
                    click: async () => {
                        newFile();
                    }
                },
                {
                    label: '打开文件',
                    click: async () => {
                        remote.dialog.showOpenDialog({
                            properties: ['openFile']
                        }).then(result => {
                            if (!result.canceled)
                                openFile(result.filePaths[0]);
                        }).catch(err => { });
                    }
                },
                {
                    label: '另存为',
                    click: async () => {
                        remote.dialog.showSaveDialog({
                            properties: ['另存为']
                        }).then(result => {
                            if (!result.canceled) {
                                saveFile(result.filePath);
                            }
                        }).catch(err => { });
                    }
                },
                isMac ? { role: 'close' } : { label: '退出', role: 'quit' }
            ]
        },
        // { role: 'editMenu' }
        {
            label: '编辑',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startspeaking' },
                            { role: 'stopspeaking' }
                        ]
                    }
                ] : [
                        { role: 'delete' },
                        { type: 'separator' },
                        { role: 'selectAll' }
                    ])
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forcereload' },
                { role: 'toggledevtools' },
                { type: 'separator' },
                { role: 'resetzoom' },
                { role: 'zoomin' },
                { role: 'zoomout' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        // { role: 'windowMenu' }
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                        { role: 'close' }
                    ])
            ]
        },
        {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More',
                    click: async () => {
                        const { shell } = require('electron')
                        await shell.openExternal('https://electronjs.org')
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    console.log(menu)
    Menu.setApplicationMenu(menu)
})();