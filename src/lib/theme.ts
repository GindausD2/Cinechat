// Parse the saved preference before the first paint. Values are fixed, never user content.
export const themeInitialization = `(()=>{let t="system";try{t=localStorage.getItem("cinechat-theme")||t}catch{}document.documentElement.dataset.theme=t==="dark"||t==="light"?t:matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"})()`;
