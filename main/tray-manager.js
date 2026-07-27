const { Tray, Menu, nativeImage } = require('electron');

// メニューバー常駐アイコン。承認待ちタブが0/1/2+のいずれかで挙動を変える:
//   0件: クリックでウィンドウ表示のみ
//   1件: クリックで即そのタブへジャンプ
//   2件以上: クリックで一覧メニューをポップアップし、選んだタブへジャンプ
function createTrayManager({ iconPath, onActivateTab, onShowWindow }) {
  const icon = nativeImage.createFromPath(iconPath);
  const tray = new Tray(icon);
  tray.setToolTip('yami-term');

  let awaitingList = []; // [{ id, snippet }]
  let destroyed = false;

  tray.on('click', () => {
    if (awaitingList.length === 0) {
      onShowWindow();
    } else if (awaitingList.length === 1) {
      onActivateTab(awaitingList[0].id);
      onShowWindow();
    } else {
      const menu = Menu.buildFromTemplate(
        awaitingList.map(item => ({
          label: item.snippet || `Tab ${item.id}`,
          click: () => {
            onActivateTab(item.id);
            onShowWindow();
          },
        }))
      );
      tray.popUpContextMenu(menu);
    }
  });

  function updateState(newAwaitingList) {
    // アプリ終了時、destroy()後にptyの非同期'exit'イベント経由で呼ばれることがある
    // (window-all-closedでtray.destroy()した後もkill()がまだ完了していないpty分の
    // 'exit'がやって来る)。破棄済みのTrayを操作すると例外を投げるため早期returnする。
    if (destroyed) return;

    awaitingList = Array.isArray(newAwaitingList) ? newAwaitingList : [];

    // setTitle()はmacOS専用API(他OSでは無視される)。アイコン自体に色付きバッジ画像を
    // 用意していないWindows/Linuxでも状態が伝わるよう、ツールチップは常に併用する。
    if (typeof tray.setTitle === 'function') {
      tray.setTitle(awaitingList.length > 0 ? '🔴' : '');
    }
    tray.setToolTip(
      awaitingList.length > 0
        ? `yami-term — ${awaitingList.length} tab(s) awaiting approval`
        : 'yami-term'
    );
  }

  function destroy() {
    destroyed = true;
    tray.destroy();
  }

  return { updateState, destroy };
}

module.exports = createTrayManager;
