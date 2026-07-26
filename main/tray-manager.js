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
    awaitingList = Array.isArray(newAwaitingList) ? newAwaitingList : [];
    tray.setTitle(awaitingList.length > 0 ? '🔴' : '');
  }

  function destroy() {
    tray.destroy();
  }

  return { updateState, destroy };
}

module.exports = createTrayManager;
