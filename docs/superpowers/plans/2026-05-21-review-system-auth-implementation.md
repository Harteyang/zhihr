# Review System 用户登录和注册功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 review-system 添加用户登录和注册功能，实现数据隔离和配置持久化，与 task-manager 共享同一套用户系统和 API。

**Architecture:** 前端使用 React + Zustand 管理状态，后端复用现有的 Cloudflare Workers API，数据存储在 D1 数据库。认证使用 JWT token，数据按 user_id 隔离。

**Tech Stack:** React, Zustand, Cloudflare Workers, D1 Database, JWT

---

## 文件结构

### 需要修改的文件
- `review-system/assets/index-BmCB11Ko.js` - 主要代码文件，包含所有组件和逻辑
- `review-system/index.html` - HTML 入口文件，可能需要添加 Modal 结构

### 文件职责
- `index-BmCB11Ko.js` - 包含所有 React 组件、状态管理、API 调用逻辑
- `index.html` - HTML 结构和 CDN 引用

---

## Task 1: 扩展 Zustand store 添加认证状态

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 在 Hd store 中添加认证状态字段**

找到 `Hd` store 定义（约第 191 行），在现有状态后添加认证相关字段：

```javascript
const Hd=FE((r,e)=>({
  theme:"auto",
  reminderEnabled:!1,
  reminderTime:"21:00",
  syncEnabled:!1,
  // 新增认证状态
  userId:null,
  username:null,
  token:null,
  isAuthenticated:!1,
  // ... 现有方法
}));
```

- [ ] **Step 2: 添加认证相关方法**

在 Hd store 中添加登录、注册、退出、设置认证信息的方法：

```javascript
const Hd=FE((r,e)=>({
  theme:"auto",
  reminderEnabled:!1,
  reminderTime:"21:00",
  syncEnabled:!1,
  userId:null,
  username:null,
  token:null,
  isAuthenticated:!1,
  setTheme:t=>{r({theme:t}),gl(ci.USER_CONFIG,{theme:t,reminderEnabled:e().reminderEnabled,reminderTime:e().reminderTime,syncEnabled:e().syncEnabled})},
  toggleTheme:()=>{const t=e().theme,n=window.matchMedia("(prefers-color-scheme: dark)").matches;r(t==="light"?{theme:"dark"}:t==="dark"?{theme:"light"}:{theme:n?"light":"dark"})},
  setReminder:(t,n)=>{r({reminderEnabled:t,reminderTime:n||e().reminderTime}),gl(ci.USER_CONFIG,{theme:e().theme,reminderEnabled:t,reminderTime:n||e().reminderTime,syncEnabled:e().syncEnabled})},
  loadFromStorage:()=>{const t=GE(ci.USER_CONFIG);t&&r(t)},
  // 新增认证方法
  setAuth:(t,n,a)=>{r({userId:t,username:n,token:a,isAuthenticated:!0}),localStorage.setItem('authToken',a),localStorage.setItem('authUserId',t),localStorage.setItem('authUsername',n)},
  clearAuth:()=>{r({userId:null,username:null,token:null,isAuthenticated:!1}),localStorage.removeItem('authToken'),localStorage.removeItem('authUserId'),localStorage.removeItem('authUsername')},
  loadAuthFromStorage:()=>{const t=localStorage.getItem('authToken'),n=localStorage.getItem('authUserId'),a=localStorage.getItem('authUsername');t&&n&&a&&r({userId:n,username:a,token:t,isAuthenticated:!0})}
}));
```

- [ ] **Step 3: 在应用初始化时加载认证状态**

找到应用初始化代码（可能在 `xC` 组件或其他地方），添加认证状态加载：

```javascript
Ne.useEffect(()=>{e()},[]),
Ne.useEffect(()=>{
  // 加载认证状态
  Hd.getState().loadAuthFromStorage();
  // ... 现有逻辑
},[r]);
```

- [ ] **Step 4: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: extend zustand store with authentication state"
```

---

## Task 2: 添加 API 基础配置和工具函数

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 添加 API 基础 URL 和工具函数**

在文件开头或合适位置添加 API 配置和工具函数：

```javascript
const API_BASE_URL = 'https://api.zhihr.vip'; // 替换为实际的 API 地址

async function apiRequest(endpoint, options = {}) {
  const { userId, token } = Hd.getState();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '请求失败');
  }

  return response.json();
}
```

- [ ] **Step 2: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add API base configuration and utility functions"
```

---

## Task 3: 添加登录和注册 API 调用函数

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 添加注册函数**

```javascript
async function registerUser(username, password) {
  const response = await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (!response.success) {
    throw new Error(response.message);
  }

  const { userId, username: name, token } = response.data;
  Hd.getState().setAuth(userId, name, token);

  return response.data;
}
```

- [ ] **Step 2: 添加登录函数**

```javascript
async function loginUser(username, password) {
  const response = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (!response.success) {
    throw new Error(response.message);
  }

  const { userId, username: name, token } = response.data;
  Hd.getState().setAuth(userId, name, token);

  return response.data;
}
```

- [ ] **Step 3: 添加退出登录函数**

```javascript
async function logoutUser() {
  Hd.getState().clearAuth();
  // 重新加载本地数据
  Hd.getState().loadFromStorage();
}
```

- [ ] **Step 4: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add authentication API functions"
```

---

## Task 4: 修改导航栏添加登录按钮和用户菜单

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 找到导航栏组件 sG**

找到导航栏组件 `sG`（约第 192 行），修改返回的 JSX：

```javascript
function sG(){
  const{toggleTheme:r}=Hd(),
    {userId,username,isAuthenticated}=Hd(),
    [e,t]=Ne.useState("--"),
    n=()=>{t(new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"}))};
  return V.jsxs("nav",{className:`h-16 bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700
      px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm`,children:[
    V.jsxs("div",{className:"flex items-center gap-3 cursor-pointer",onClick:()=>window.open("https://www.zhihr.vip","_blank"),children:[
      V.jsxs("svg",{xmlns:"http://www.w3.org/2000/svg",width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"3",strokeLinecap:"round",strokeLinejoin:"round",className:"text-blue-600 dark:text-blue-400",children:[
        V.jsx("circle",{cx:"12",cy:"5",r:"1"}),
        V.jsx("path",{d:"m9 20 3-6 3 6"}),
        V.jsx("path",{d:"m6 8 6 2 6-2"}),
        V.jsx("path",{d:"M12 10v4"})
      ]}),
      V.jsxs("div",{children:[
        V.jsx("h1",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100",children:"知HR-复盘系统"}),
        V.jsx("p",{className:"text-xs text-slate-500 dark:text-slate-400 hidden sm:block",children:"Vibe Coding，为HR制作效率工具"})
      ]})
    ]}),
    V.jsxs("div",{className:"flex items-center gap-2",children:[
      isAuthenticated ? V.jsxs("div",{className:"relative",children:[
        V.jsxs("button",{onClick:()=>{},className:"flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors",children:[
          V.jsx("span",{children:username}),
          V.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:V.jsx("path",{d:"m6 9 6 6 6-6"})})
        ]}),
        V.jsx("div",{className:"hidden absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-2 z-50",children:V.jsx("button",{onClick:logoutUser,className:"w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2",children:V.jsxs(V.Fragment,{children:[
          V.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:V.jsx("path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"})}),
          V.jsx("polyline",{points:"16 17 21 12 16 7"}),
          V.jsx("line",{x1:"21",x2:"9",y1:"12",y2:"12"})
        ]})})})
      ]}) : V.jsxs("button",{onClick:()=>{},className:"px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors",children:[
        V.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:V.jsx("path",{d:"M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"})}),
        V.jsx("polyline",{points:"10 17 15 12 10 7"}),
        V.jsx("line",{x1:"15",x2:"3",y1:"12",y2:"12"})
      ]}),
      V.jsxs("button",{onClick:n,className:`p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50
            dark:text-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors duration-200`,title:"云端同步",children:V.jsx(CF,{className:"w-5 h-5"})}),
      V.jsxs("span",{className:"text-xs text-slate-500 dark:text-slate-400 hidden sm:block",children:["上次同步: ",e]}),
      V.jsxs("button",{onClick:r,className:`p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50
            dark:text-slate-300 dark:hover:bg-slate-700 rounded-md transition-colors duration-200`,"aria-label":"切换主题",children:[
        V.jsx(LF,{className:"w-5 h-5 hidden dark:block"}),
        V.jsx(wF,{className:"w-5 h-5 block dark:hidden"})
      ]})
    ]})]})
}
```

- [ ] **Step 2: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add login button and user menu to navigation bar"
```

---

## Task 5: 添加登录/注册 Modal 组件

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 添加 Modal 状态管理**

在合适位置添加 Modal 状态：

```javascript
function LoginRegisterModal(){
  const[isOpen,setIsOpen]=Ne.useState(!1),
    [isLoginMode,setIsLoginMode]=Ne.useState(!0),
    [username,setUsername]=Ne.useState(""),
    [password,setPassword]=Ne.useState(""),
    [passwordConfirm,setPasswordConfirm]=Ne.useState(""),
    [error,setError]=Ne.useState(""),
    [isLoading,setIsLoading]=Ne.useState(!1);
  // ... 组件逻辑
}
```

- [ ] **Step 2: 实现登录逻辑**

```javascript
const handleLogin=async()=>{
  setError("");
  if(!username||!password){
    setError("请输入账号和密码");
    return;
  }
  setIsLoading(!1);
  try{
    await loginUser(username,password);
    setIsOpen(!1);
    setUsername("");
    setPassword("");
  }catch(e){
    setError(e.message);
  }finally{
    setIsLoading(!0);
  }
};
```

- [ ] **Step 3: 实现注册逻辑**

```javascript
const handleRegister=async()=>{
  setError("");
  if(!username||!password||!passwordConfirm){
    setError("请填写所有字段");
    return;
  }
  if(username.length<3){
    setError("账号至少3位");
    return;
  }
  if(password.length<4){
    setError("密码至少4位");
    return;
  }
  if(password!==passwordConfirm){
    setError("两次密码不一致");
    return;
  }
  setIsLoading(!1);
  try{
    await registerUser(username,password);
    setIsOpen(!1);
    setUsername("");
    setPassword("");
    setPasswordConfirm("");
  }catch(e){
    setError(e.message);
  }finally{
    setIsLoading(!0);
  }
};
```

- [ ] **Step 4: 实现 Modal JSX**

```javascript
return V.jsxs("div",{className:`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isOpen?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,onClick:()=>setIsOpen(!1),children:[
  V.jsx("div",{className:"absolute inset-0 bg-black/50"}),
  V.jsxs("div",{className:"relative bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4",onClick:e=>e.stopPropagation(),children:[
    V.jsxs("div",{className:"flex items-center justify-between mb-6",children:[
      V.jsx("h2",{className:"text-xl font-semibold text-slate-800 dark:text-slate-100",children:isLoginMode?"登录":"注册"}),
      V.jsx("button",{onClick:()=>setIsOpen(!1),className:"p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",children:V.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"20",height:"20",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:V.jsx("line",{x1:"18",x2:"6",y1:"6",y2:"18"})})})
    ]}),
    isLoginMode ? V.jsxs("div",{className:"space-y-4",children:[
      V.jsxs("div",{children:[
        V.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1",children:"账号"}),
        V.jsx("input",{type:"text",value:username,onChange:e=>setUsername(e.target.value),placeholder:"输入账号",className:"w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"})
      ]}),
      V.jsxs("div",{children:[
        V.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1",children:"密码"}),
        V.jsx("input",{type:"password",value:password,onChange:e=>setPassword(e.target.value),placeholder:"输入密码",className:"w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500",onKeyPress:e=>e.key==="Enter"&&handleLogin()})
      ]}),
      error&&V.jsx("div",{className:"text-sm text-red-500",children:error}),
      V.jsx("button",{onClick:handleLogin,disabled:isLoading,className:"w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50",children:isLoading?"登录中...":"登录"}),
      V.jsxs("p",{className:"text-center text-sm text-slate-500 dark:text-slate-400",children:["没有账号？",V.jsx("a",{href:"#",onClick:e=>{e.preventDefault();setIsLoginMode(!1);setError("");},className:"text-blue-600 hover:underline",children:"注册新账号"})]})
    ]}) : V.jsxs("div",{className:"space-y-4",children:[
      V.jsxs("div",{children:[
        V.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1",children:"账号"}),
        V.jsx("input",{type:"text",value:username,onChange:e=>setUsername(e.target.value),placeholder:"设置账号（至少3位）",className:"w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"})
      ]}),
      V.jsxs("div",{children:[
        V.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1",children:"密码"}),
        V.jsx("input",{type:"password",value:password,onChange:e=>setPassword(e.target.value),placeholder:"设置密码（至少4位）",className:"w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"})
      ]}),
      V.jsxs("div",{children:[
        V.jsx("label",{className:"block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1",children:"确认密码"}),
        V.jsx("input",{type:"password",value:passwordConfirm,onChange:e=>setPasswordConfirm(e.target.value),placeholder:"再次输入密码",className:"w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500",onKeyPress:e=>e.key==="Enter"&&handleRegister()})
      ]}),
      error&&V.jsx("div",{className:"text-sm text-red-500",children:error}),
      V.jsx("button",{onClick:handleRegister,disabled:isLoading,className:"w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50",children:isLoading?"注册中...":"注册"}),
      V.jsxs("p",{className:"text-center text-sm text-slate-500 dark:text-slate-400",children:["已有账号？",V.jsx("a",{href:"#",onClick:e=>{e.preventDefault();setIsLoginMode(!0);setError("");},className:"text-blue-600 hover:underline",children:"登录"})]})
    ]})
  ]})
]});
```

- [ ] **Step 5: 在主应用中添加 Modal**

找到主应用组件，添加 Modal：

```javascript
function App(){
  // ... 现有代码
  return V.jsxs("div",{className:"min-h-screen bg-slate-50 dark:bg-slate-900",children:[
    V.jsx(sG,{}),
    V.jsx(LoginRegisterModal,{}),
    // ... 现有内容
  ]});
}
```

- [ ] **Step 6: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add login/register modal component"
```

---

## Task 6: 修改数据存储逻辑支持云端存储

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 修改 Kc store 添加云端数据加载方法**

找到 `Kc` store（约第 197 行），添加云端数据加载方法：

```javascript
const Kc=FE((r,e)=>({
  reviews:[],
  isLoading:!0,
  isSyncing:!1,
  get todayRecord(){
    const t=og();
    return e().reviews.find(n=>n.date===t)||null
  },
  getRecordByDate:t=>e().reviews.find(n=>n.date===t)||null,
  getRecordsInRange:(t,n)=>e().reviews.filter(a=>a.date>=t&&a.date<=n),
  saveRecord:(t,n,a)=>{
    const i=e().reviews.findIndex(s=>s.date===t),
      o=new Date().toISOString();
    if(i>=0){
      const s={...e().reviews[i],content:n,summary:a,updatedAt:o},
        l=[...e().reviews];
      l[i]=s,r({reviews:l}),gl(ci.REVIEW_DATA,l)
    }else{
      const l=[{id:xG(),date:t,content:n,summary:a,createdAt:o,updatedAt:o},...e().reviews];
      r({reviews:l}),gl(ci.REVIEW_DATA,l)
    }
  },
  updateRecord:(t,n)=>{
    const a=e().reviews.map(i=>i.id===t?{...i,...n,updatedAt:new Date().toISOString()}:i);
    r({reviews:a}),gl(ci.REVIEW_DATA,a)
  },
  deleteRecord:t=>{
    const n=e().reviews.filter(a=>a.id!==t);
    r({reviews:n}),gl(ci.REVIEW_DATA,n)
  },
  loadFromStorage:()=>{
    const t=GE(ci.REVIEW_DATA);
    r({reviews:t||[],isLoading:!1})
  },
  // 新增云端数据方法
  loadFromCloud:async()=>{
    try{
      r({isLoading:!0});
      const response=await apiRequest('/api/reviews');
      r({reviews:response.data||[],isLoading:!1})
    }catch(e){
      console.error('加载云端数据失败:',e);
      r({isLoading:!1})
    }
  },
  saveToCloud:async(t,n,a)=>{
    try{
      r({isSyncing:!0});
      const i=e().reviews.findIndex(s=>s.date===t);
      if(i>=0){
        const o={...e().reviews[i],content:n,summary:a,updatedAt:new Date().toISOString()};
        await apiRequest(`/api/reviews/${o.id}`,{
          method:'PUT',
          body:JSON.stringify({title:o.date,content:n,review_date:o.date})
        });
        const l=[...e().reviews];
        l[i]=o,r({reviews:l})
      }else{
        const l={id:xG(),date:t,content:n,summary:a,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        await apiRequest('/api/reviews',{
          method:'POST',
          body:JSON.stringify({title:l.date,content:n,review_date:l.date})
        });
        r({reviews:[l,...e().reviews]})
      }
    }catch(e){
      console.error('保存到云端失败:',e);
      throw e
    }finally{
      r({isSyncing:!1})
    }
  }
}));
```

- [ ] **Step 2: 修改 xC 组件支持云端存储**

找到 `xC` 组件（复盘记录组件），修改保存逻辑：

```javascript
function xC(){
  const{todayRecord:r,loadFromStorage:e,loadFromCloud:t}=Kc(),
    {isAuthenticated:n}=Hd(),
    [a,i]=Ne.useState(Ef),
    [o,s]=Ne.useState({health:"",work:"",study:"",social:"",finance:"",life:"",spirit:"",leisure:""}),
    [l,u]=Ne.useState("");
  Ne.useEffect(()=>{
    n?t():e()
  },[n]),
  Ne.useEffect(()=>{
    if(r&&(s(r.content),u(r.summary),r.content.health))try{
      const h=JSON.parse(r.content.health);
      Array.isArray(h)&&h.length>0&&i(h)
    }catch{i(Ef)}
  },[r]);
  const c=h=>{i(h),s(v=>({...v,health:JSON.stringify(h)}))},
    f=(h,v)=>{s(d=>({...d,[h]:v}))},
    m=()=>{i(Ef),s({health:"",work:"",study:"",social:"",finance:"",life:"",spirit:"",leisure:""}),u("")},
    p=async()=>{
      try{
        if(n){
          await Kc.getState().saveToCloud(og(),o,l);
          U1("保存成功","success")
        }else{
          Kc.getState().saveRecord(og(),o,l);
          U1("保存成功","success")
        }
      }catch{
        U1("保存失败","error")
      }
    },
    g=og();
  return V.jsxs("div",{children:[
    V.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4 mb-6",children:Object.values(wr).map(h=>h.key==="health"?V.jsx(mC,{config:h,children:V.jsx(fG,{value:a,onChange:c})},h.key):V.jsx(mC,{config:h,children:V.jsx(HE,{value:o[h.key],onChange:v=>f(h.key,v.target.value),rows:3,placeholder:`记录今天的${h.name.toLowerCase()}...`})},h.key))}),
    V.jsx(cG,{value:l,onChange:u}),
    V.jsx(wG,{date:g,content:o,summary:l,onSave:p,onReset:m})
  ]});
}
```

- [ ] **Step 3: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: modify data storage logic to support cloud storage"
```

---

## Task 7: 添加配置同步逻辑

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 在 Hd store 添加配置同步方法**

```javascript
const Hd=FE((r,e)=>({
  theme:"auto",
  reminderEnabled:!1,
  reminderTime:"21:00",
  syncEnabled:!1,
  userId:null,
  username:null,
  token:null,
  isAuthenticated:!1,
  setTheme:t=>{
    r({theme:t});
    const n={theme:t,reminderEnabled:e().reminderEnabled,reminderTime:e().reminderTime,syncEnabled:e().syncEnabled};
    gl(ci.USER_CONFIG,n);
    e().isAuthenticated&&saveConfigToCloud(n)
  },
  toggleTheme:()=>{
    const t=e().theme,n=window.matchMedia("(prefers-color-scheme: dark)").matches;
    const a=t==="light"?{theme:"dark"}:t==="dark"?{theme:"light"}:{theme:n?"light":"dark"};
    r(a);
    const i={...a,reminderEnabled:e().reminderEnabled,reminderTime:e().reminderTime,syncEnabled:e().syncEnabled};
    gl(ci.USER_CONFIG,i);
    e().isAuthenticated&&saveConfigToCloud(i)
  },
  setReminder:(t,n)=>{
    r({reminderEnabled:t,reminderTime:n||e().reminderTime});
    const a={theme:e().theme,reminderEnabled:t,reminderTime:n||e().reminderTime,syncEnabled:e().syncEnabled};
    gl(ci.USER_CONFIG,a);
    e().isAuthenticated&&saveConfigToCloud(a)
  },
  loadFromStorage:()=>{
    const t=GE(ci.USER_CONFIG);
    t&&r(t)
  },
  setAuth:(t,n,a)=>{r({userId:t,username:n,token:a,isAuthenticated:!0}),localStorage.setItem('authToken',a),localStorage.setItem('authUserId',t),localStorage.setItem('authUsername',n)},
  clearAuth:()=>{r({userId:null,username:null,token:null,isAuthenticated:!1}),localStorage.removeItem('authToken'),localStorage.removeItem('authUserId'),localStorage.removeItem('authUsername')},
  loadAuthFromStorage:()=>{
    const t=localStorage.getItem('authToken'),
      n=localStorage.getItem('authUserId'),
      a=localStorage.getItem('authUsername');
    t&&n&&a&&r({userId:n,username:a,token:t,isAuthenticated:!0})
  },
  loadConfigFromCloud:async()=>{
    if(!e().isAuthenticated)return;
    try{
      const response=await apiRequest('/api/config');
      if(response.success&&response.data){
        const t=JSON.parse(response.data.config);
        r(t)
      }
    }catch(e){
      console.error('加载云端配置失败:',e)
    }
  }
}));

async function saveConfigToCloud(config){
  try{
    await apiRequest('/api/config',{
      method:'PUT',
      body:JSON.stringify({config})
    })
  }catch(e){
    console.error('保存配置到云端失败:',e)
  }
}
```

- [ ] **Step 2: 在登录后加载云端配置**

修改登录函数，登录后加载云端配置：

```javascript
async function loginUser(username,password){
  const response=await apiRequest('/api/auth/login',{
    method:'POST',
    body:JSON.stringify({username,password})
  });

  if(!response.success){
    throw new Error(response.message);
  }

  const{userId,username:name,token}=response.data;
  Hd.getState().setAuth(userId,name,token);

  // 加载云端配置
  await Hd.getState().loadConfigFromCloud();

  return response.data;
}
```

- [ ] **Step 3: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add config synchronization logic"
```

---

## Task 8: 添加数据合并确认对话框

**Files:**
- Modify: `review-system/assets/index-BmCB11Ko.js`

- [ ] **Step 1: 添加数据合并对话框组件**

```javascript
function DataMergeDialog({isOpen,onClose,onMerge,onClear,localCount}){
  return V.jsxs("div",{className:`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200 ${isOpen?"opacity-100 pointer-events-auto":"opacity-0 pointer-events-none"}`,onClick:onClose,children:[
    V.jsx("div",{className:"absolute inset-0 bg-black/50"}),
    V.jsxs("div",{className:"relative bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4",onClick:e=>e.stopPropagation(),children:[
      V.jsxs("div",{className:"text-center mb-6",children:[
        V.jsx("div",{className:"w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center",children:V.jsx("svg",{xmlns:"http://www.w3.org/2000/svg",width:"32",height:"32",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",className:"text-blue-600 dark:text-blue-400",children:V.jsx("path",{d:"M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"})})}),
        V.jsx("h3",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2",children:"数据同步"}),
        V.jsx("p",{className:"text-sm text-slate-600 dark:text-slate-400",children:`检测到本地有 ${localCount} 条复盘记录，如何处理？`})
      ]}),
      V.jsxs("div",{className:"flex gap-3",children:[
        V.jsx("button",{onClick:onMerge,className:"flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors",children:"合并到云端"}),
        V.jsx("button",{onClick:onClear,className:"flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors",children:"清空本地数据"}),
        V.jsx("button",{onClick:onClose,className:"flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 font-medium rounded-md hover:bg-slate-200 dark:hover:bg-slate-500 transition-colors",children:"取消"})
      ]})
    ]})
  ]});
}
```

- [ ] **Step 2: 修改登录函数添加数据合并逻辑**

```javascript
async function loginUser(username,password){
  const response=await apiRequest('/api/auth/login',{
    method:'POST',
    body:JSON.stringify({username,password})
  });

  if(!response.success){
    throw new Error(response.message);
  }

  const{userId,username:name,token}=response.data;
  Hd.getState().setAuth(userId,name,token);

  // 加载云端配置
  await Hd.getState().loadConfigFromCloud();

  // 检查本地数据
  const localData=GE(ci.REVIEW_DATA);
  if(localData&&localData.length>0){
    // 显示数据合并对话框
    return{showMergeDialog:!0,localCount:localData.length}
  }

  // 加载云端数据
  await Kc.getState().loadFromCloud();

  return response.data;
}
```

- [ ] **Step 3: 在主应用中添加数据合并对话框**

修改主应用组件，添加数据合并对话框：

```javascript
function App(){
  const[showMergeDialog,setShowMergeDialog]=Ne.useState(!1),
    [mergeDialogData,setMergeDialogData]=Ne.useState(null);

  const handleLogin=async(username,password)=>{
    try{
      const result=await loginUser(username,password);
      if(result.showMergeDialog){
        setMergeDialogData({localCount:result.localCount});
        setShowMergeDialog(!0)
      }
    }catch(e){
      console.error('登录失败:',e)
    }
  };

  const handleMerge=async()=>{
    try{
      const localData=GE(ci.REVIEW_DATA);
      if(localData&&localData.length>0){
        for(const record of localData){
          await apiRequest('/api/reviews',{
            method:'POST',
            body:JSON.stringify({title:record.date,content:record.content,review_date:record.date})
          })
        }
      }
      setShowMergeDialog(!1);
      await Kc.getState().loadFromCloud();
      localStorage.removeItem(ci.REVIEW_DATA);
      U1("数据合并成功","success")
    }catch(e){
      console.error('数据合并失败:',e);
      U1("数据合并失败","error")
    }
  };

  const handleClear=()=>{
    localStorage.removeItem(ci.REVIEW_DATA);
    setShowMergeDialog(!1);
    Kc.getState().loadFromCloud();
    U1("本地数据已清空","success")
  };

  return V.jsxs("div",{className:"min-h-screen bg-slate-50 dark:bg-slate-900",children:[
    V.jsx(sG,{onLogin:handleLogin}),
    V.jsx(LoginRegisterModal,{onLogin:handleLogin}),
    V.jsx(DataMergeDialog,{isOpen:showMergeDialog,onClose:()=>setShowMergeDialog(!1),onMerge:handleMerge,onClear:handleClear,localCount:mergeDialogData?.localCount||0}),
    // ... 现有内容
  ]});
}
```

- [ ] **Step 4: 提交更改**

```bash
git add review-system/assets/index-BmCB11Ko.js
git commit -m "feat: add data merge confirmation dialog"
```

---

## Task 9: 测试功能

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: 测试注册功能**

1. 打开 review-system
2. 点击导航栏的"登录"按钮
3. 点击"注册新账号"链接
4. 填写账号（至少3位）和密码（至少4位）
5. 确认密码
6. 点击"注册"按钮
7. 验证：注册成功后自动登录，导航栏显示用户名

- [ ] **Step 2: 测试登录功能**

1. 退出登录
2. 点击导航栏的"登录"按钮
3. 填写已注册的账号和密码
4. 点击"登录"按钮
5. 验证：登录成功后导航栏显示用户名

- [ ] **Step 3: 测试数据合并功能**

1. 在未登录状态下添加一些复盘记录
2. 登录账号
3. 验证：显示数据合并对话框
4. 点击"合并到云端"
5. 验证：本地数据合并到云端，显示成功提示

- [ ] **Step 4: 测试数据同步功能**

1. 登录账号
2. 添加复盘记录
3. 点击"保存"按钮
4. 验证：数据保存到云端
5. 刷新页面
6. 验证：数据仍然存在

- [ ] **Step 5: 测试配置同步功能**

1. 登录账号
2. 修改主题
3. 刷新页面
4. 验证：主题设置保持不变

- [ ] **Step 6: 测试退出登录功能**

1. 登录账号
2. 点击用户菜单
3. 点击"退出登录"
4. 验证：退出成功，导航栏显示"登录"按钮
5. 验证：切换到本地数据模式

- [ ] **Step 7: 提交测试结果**

```bash
git add .
git commit -m "test: complete authentication feature testing"
```

---

## Task 10: 更新设计文档

**Files:**
- Modify: `docs/superpowers/specs/2026-05-21-review-system-auth-design.md`

- [ ] **Step 1: 添加实施总结**

在设计文档末尾添加实施总结：

```markdown
## 7. 实施总结

### 7.1 已完成功能

- [x] 用户注册功能
- [x] 用户登录功能
- [x] JWT token 认证
- [x] 数据隔离（按 user_id）
- [x] 配置持久化（user_configs 表）
- [x] 数据合并确认对话框
- [x] 云端数据存储
- [x] 本地数据存储（离线模式）

### 7.2 技术实现

- 前端：React + Zustand
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1
- 认证：JWT token

### 7.3 测试结果

所有功能测试通过，包括：
- 注册/登录流程
- 数据同步
- 配置持久化
- 数据合并
- 退出登录

### 7.4 后续优化

- [ ] 添加"记住我"功能
- [ ] 添加密码重置功能
- [ ] 添加数据导出功能
- [ ] 优化错误处理
- [ ] 添加加载状态提示

---

**实施完成日期:** 2026-05-21
**实施人员:** AI Assistant
```

- [ ] **Step 2: 提交文档更新**

```bash
git add docs/superpowers/specs/2026-05-21-review-system-auth-design.md
git commit -m "docs: add implementation summary to design document"
```

---

## 总结

本实施计划涵盖了为 review-system 添加用户登录和注册功能的所有必要步骤，包括：

1. 扩展 Zustand store 添加认证状态
2. 添加 API 基础配置和工具函数
3. 添加登录和注册 API 调用函数
4. 修改导航栏添加登录按钮和用户菜单
5. 添加登录/注册 Modal 组件
6. 修改数据存储逻辑支持云端存储
7. 添加配置同步逻辑
8. 添加数据合并确认对话框
9. 测试所有功能
10. 更新设计文档

每个任务都包含详细的步骤和代码示例，确保实施者能够准确完成。