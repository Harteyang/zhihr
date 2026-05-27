/**
 * 知HR 统一认证模块
 * 
 * 功能：
 * 1. 统一的身份认证管理（登录、注册、退出）
 * 2. 跨标签页状态同步（基于 storage 事件）
 * 3. 统一的 API 调用封装
 * 4. Token 自动刷新
 * 
 * 使用方式：
 * <script src="shared-auth.js"></script>
 * <script>
 *   // 初始化
 *   SharedAuth.init();
 *   
 *   // 监听认证状态变化
 *   SharedAuth.on('auth:change', (state) => {
 *     console.log('认证状态变化:', state);
 *   });
 *   
 *   // 登录
 *   await SharedAuth.login(username, password);
 *   
 *   // 获取当前用户信息
 *   const user = SharedAuth.getUser();
 * </script>
 */

(function() {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    API_BASE_URL: 'https://api.zhihr.vip',
    TOKEN_KEY: 'zhihr_access_token',
    REFRESH_TOKEN_KEY: 'zhihr_refresh_token',
    USER_ID_KEY: 'zhihr_user_id',
    USERNAME_KEY: 'zhihr_username',
    TOKEN_REFRESH_BUFFER: 60, // 提前60秒刷新token
  };

  // ==================== 内部状态 ====================
  let state = {
    userId: null,
    username: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isInitializing: false,
  };

  let eventListeners = {};
  let refreshTimer = null;
  let pendingRequests = []; // Token刷新期间的排队请求

  // ==================== 事件系统 ====================
  function emit(event, data) {
    const listeners = eventListeners[event] || [];
    listeners.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error(`[SharedAuth] Event handler error for ${event}:`, e);
      }
    });
  }

  function on(event, callback) {
    if (!eventListeners[event]) {
      eventListeners[event] = [];
    }
    eventListeners[event].push(callback);
    return () => {
      const idx = eventListeners[event].indexOf(callback);
      if (idx > -1) eventListeners[event].splice(idx, 1);
    };
  }

  // ==================== Storage 操作 ====================
  function getFromStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn(`[SharedAuth] Failed to read ${key} from localStorage:`, e);
      return null;
    }
  }

  function setToStorage(key, value) {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[SharedAuth] Failed to write ${key} to localStorage:`, e);
    }
  }

  function clearStorage() {
    ['zhihr_access_token', 'zhihr_refresh_token', 'zhihr_user_id', 'zhihr_username'].forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // 忽略
      }
    });
  }

  // ==================== 状态同步 ====================
  function updateStateFromStorage() {
    const token = getFromStorage(CONFIG.TOKEN_KEY);
    const refreshToken = getFromStorage(CONFIG.REFRESH_TOKEN_KEY);
    const userId = getFromStorage(CONFIG.USER_ID_KEY);
    const username = getFromStorage(CONFIG.USERNAME_KEY);

    const wasAuthenticated = state.isAuthenticated;
    
    state.token = token;
    state.refreshToken = refreshToken;
    state.userId = userId;
    state.username = username;
    state.isAuthenticated = !!(token && userId && username);

    if (wasAuthenticated !== state.isAuthenticated) {
      emit('auth:change', {
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        username: state.username,
      });
    }

    if (state.isAuthenticated) {
      scheduleTokenRefresh();
    }

    return state;
  }

  // ==================== 跨标签页同步 ====================
  function handleStorageChange(e) {
    // 只监听与认证相关的 key
    const authKeys = [
      CONFIG.TOKEN_KEY,
      CONFIG.REFRESH_TOKEN_KEY,
      CONFIG.USER_ID_KEY,
      CONFIG.USERNAME_KEY,
    ];

    if (authKeys.some(key => e.key === key)) {
      const oldState = { ...state };
      updateStateFromStorage();

      if (oldState.isAuthenticated !== state.isAuthenticated ||
          oldState.userId !== state.userId ||
          oldState.username !== state.username) {
        emit('auth:storage-change', {
          isAuthenticated: state.isAuthenticated,
          userId: state.userId,
          username: state.username,
        });
      }
    }
  }

  // ==================== Token 刷新 ====================
  async function refreshToken() {
    const currentRefreshToken = getFromStorage(CONFIG.REFRESH_TOKEN_KEY);
    if (!currentRefreshToken) {
      // Token 已过期，清除状态
      clearStorage();
      updateStateFromStorage();
      emit('auth:expired');
      return null;
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });

      if (!response.ok) {
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Refresh failed');
      }

      const { token, refreshToken: newRefreshToken } = result.data;
      
      setToStorage(CONFIG.TOKEN_KEY, token);
      setToStorage(CONFIG.REFRESH_TOKEN_KEY, newRefreshToken);
      
      // 通知所有页面
      // storage 事件会自动触发跨标签页同步

      return token;
    } catch (error) {
      console.error('[SharedAuth] Token refresh failed:', error);
      clearStorage();
      updateStateFromStorage();
      emit('auth:expired');
      return null;
    }
  }

  function scheduleTokenRefresh() {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }

    if (!state.token) return;

    // 简单策略：每小时检查一次
    // 更精确的实现可以解析 JWT 的 exp 字段
    refreshTimer = setTimeout(async () => {
      await refreshToken();
    }, CONFIG.TOKEN_REFRESH_BUFFER * 1000);
  }

  // ==================== API 请求封装 ====================
  async function apiRequest(url, options = {}) {
    const { method = 'GET', headers = {}, body = null, needAuth = true } = options;

    let token = state.token;

    // 如果需要认证但没有 token，尝试刷新
    if (needAuth && !token) {
      token = await refreshToken();
      if (!token) {
        return { success: false, message: '登录已过期，请重新登录' };
      }
    }

    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    };

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, config);
      
      if (response.status === 401) {
        // Token 过期，尝试刷新并重试
        const newToken = await refreshToken();
        if (newToken) {
          config.headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${CONFIG.API_BASE_URL}${url}`, config);
          return await retryResponse.json();
        }
        return { success: false, message: '登录已过期，请重新登录' };
      }

      return await response.json();
    } catch (error) {
      console.error('[SharedAuth] API request failed:', error);
      return { success: false, message: '网络错误，请检查网络连接' };
    }
  }

  // ==================== 认证操作 ====================
  async function login(username, password) {
    if (!username || !password) {
      return { success: false, message: '请输入账号和密码' };
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        return result;
      }

      const { userId, username: name, token, refreshToken } = result.data;

      setToStorage(CONFIG.USER_ID_KEY, userId);
      setToStorage(CONFIG.USERNAME_KEY, name);
      setToStorage(CONFIG.TOKEN_KEY, token);
      setToStorage(CONFIG.REFRESH_TOKEN_KEY, refreshToken);

      updateStateFromStorage();
      emit('auth:login', { userId, username: name });

      return { success: true, message: '登录成功', data: { userId, username: name, token, refreshToken } };
    } catch (error) {
      console.error('[SharedAuth] Login error:', error);
      return { success: false, message: '登录失败，请检查网络' };
    }
  }

  async function register(username, password) {
    if (!username || !password) {
      return { success: false, message: '请输入账号和密码' };
    }

    if (username.length < 3) {
      return { success: false, message: '账号至少3个字符' };
    }

    if (password.length < 4) {
      return { success: false, message: '密码至少4位' };
    }

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        return result;
      }

      const { userId, username: name, token, refreshToken } = result.data;

      setToStorage(CONFIG.USER_ID_KEY, userId);
      setToStorage(CONFIG.USERNAME_KEY, name);
      setToStorage(CONFIG.TOKEN_KEY, token);
      setToStorage(CONFIG.REFRESH_TOKEN_KEY, refreshToken);

      updateStateFromStorage();
      emit('auth:register', { userId, username: name });

      return { success: true, message: '注册成功', data: { userId, username: name, token, refreshToken } };
    } catch (error) {
      console.error('[SharedAuth] Register error:', error);
      return { success: false, message: '注册失败，请检查网络' };
    }
  }

  function logout() {
    clearStorage();
    updateStateFromStorage();
    emit('auth:logout');
  }

  // ==================== 公共 API ====================
  window.SharedAuth = {
    // 初始化
    init: function() {
      if (state.isInitializing) return;
      state.isInitializing = true;

      // 从 localStorage 加载状态
      updateStateFromStorage();

      // 监听跨标签页变化
      window.addEventListener('storage', handleStorageChange);

      // 页面可见性变化时刷新状态
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          updateStateFromStorage();
        }
      });

      console.log('[SharedAuth] Initialized:', {
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        username: state.username,
      });

      return state;
    },

    // 事件监听
    on,

    // 获取当前用户信息
    getUser: function() {
      return {
        userId: state.userId,
        username: state.username,
        isAuthenticated: state.isAuthenticated,
      };
    },

    // 获取 Token
    getToken: function() {
      return state.token;
    },

    // 判断是否已登录
    isAuthenticated: function() {
      return state.isAuthenticated;
    },

    // 登录
    login,

    // 注册
    register,

    // 退出登录
    logout,

    // 刷新 Token
    refreshToken,

    // API 请求封装
    apiRequest,

    // 获取配置
    getConfig: function() {
      return { ...CONFIG };
    },
  };
})();
