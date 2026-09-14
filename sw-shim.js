// 桌面端 ServiceWorker 垫片：Electron 自定义协议（quant-tasks://）页面的
// navigator.serviceWorker 容器处于损坏状态——任何调用都抛 InvalidStateError
// （document is in an invalid state），会让 Dexie Cloud 的同步初始化无声死亡。
// 网页协议（http/https）下本脚本不生效，真实 ServiceWorker 照常工作。
try {
  if (location.protocol !== 'http:' && location.protocol !== 'https:' && 'serviceWorker' in navigator) {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: null,
        ready: new Promise(() => {}),
        getRegistrations: () => Promise.resolve([]),
        getRegistration: () => Promise.resolve(undefined),
        register: () => Promise.reject(new Error('Service workers are not available in the desktop app.')),
        addEventListener: () => {},
        removeEventListener: () => {},
        onmessage: null,
        oncontrollerchange: null,
      },
    });
  }
} catch {
  // 替换失败则保留原生行为
}
