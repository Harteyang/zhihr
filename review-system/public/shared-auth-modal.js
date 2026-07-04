/**
 * 知HR 统一登录/注册弹窗组件
 * 
 * 基于 UI 设计规范 (2026-05-23-ui-design-spec.md)
 * 
 * 功能：
 * 1. 统一的登录/注册弹窗 UI
 * 2. 支持登录/注册模式切换
 * 3. 表单验证
 * 4. 加载状态管理
 * 5. 错误提示
 * 6. 响应式设计（移动端全宽，PC端最大448px）
 * 
 * 使用方式：
 * <script src="shared-auth.js"></script>
 * <script src="shared-auth-modal.js"></script>
 * <script>
 *   // 初始化
 *   AuthModal.init();
 *   
 *   // 打开登录弹窗
 *   AuthModal.open();
 *   
 *   // 打开注册弹窗
 *   AuthModal.open('register');
 *   
 *   // 关闭弹窗
 *   AuthModal.close();
 * </script>
 */

(function() {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    MODAL_ID: 'zhihr-auth-modal',
    LOGIN_FORM_ID: 'zhihr-login-form',
    REGISTER_FORM_ID: 'zhihr-register-form',
    LOGIN_ERROR_ID: 'zhihr-login-error',
    REGISTER_ERROR_ID: 'zhihr-register-error',
    LOGIN_BTN_ID: 'zhihr-login-btn',
    REGISTER_BTN_ID: 'zhihr-register-btn',
  };

  let isOpen = false;
  let currentMode = 'login'; // 'login' | 'register'
  let loginErrorCount = 0;
  let registerErrorCount = 0;
  const MAX_ERROR_COUNT = 3;

  // ==================== 生成验证码 ====================
  function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    return {
      question: `${num1} + ${num2} = ?`,
      answer: num1 + num2,
    };
  }

  let captchaData = generateCaptcha();

  // ==================== 错误提示 ====================
  let errorTimeout = null;
  function showError(elementId, message, duration = 3000) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }
    el.textContent = message;
    el.classList.remove('hidden');
    errorTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, duration);
  }

  // ==================== 按钮加载状态 ====================
  function setButtonLoading(buttonId, loading, originalText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    btn.disabled = loading;
    if (loading) {
      btn.innerHTML = `<svg class="animate-spin h-4 w-4 mr-2 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>请稍候...`;
    } else {
      btn.textContent = originalText;
    }
  }

  // ==================== 表单验证 ====================
  function validateLogin(username, password) {
    if (!username || !password) {
      return { valid: false, message: '请输入账号和密码' };
    }
    return { valid: true };
  }

  function validateRegister(username, password, passwordConfirm) {
    if (!username || !password || !passwordConfirm) {
      return { valid: false, message: '请填写所有字段' };
    }
    if (username.length < 3) {
      return { valid: false, message: '账号至少3个字符' };
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
      return { valid: false, message: '账号只能包含字母、数字、下划线和中文' };
    }
    if (password.length < 4) {
      return { valid: false, message: '密码至少4位' };
    }
    if (password !== passwordConfirm) {
      return { valid: false, message: '两次密码不一致' };
    }
    return { valid: true };
  }

  // ==================== 是否启用验证码 ====================
  function shouldShowCaptcha() {
    if (currentMode === 'login') {
      return loginErrorCount >= MAX_ERROR_COUNT;
    } else {
      return registerErrorCount >= MAX_ERROR_COUNT;
    }
  }

  // ==================== 登录处理 ====================
  async function handleLogin() {
    const usernameInput = document.getElementById('zhihr-login-username');
    const passwordInput = document.getElementById('zhihr-login-password');
    const captchaInput = document.getElementById('zhihr-captcha-input');
    
    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    const validation = validateLogin(username, password);
    if (!validation.valid) {
      showError(CONFIG.LOGIN_ERROR_ID, validation.message);
      return;
    }

    // 如果达到错误次数阈值，需要验证验证码
    if (shouldShowCaptcha()) {
      const captchaAnswer = parseInt(captchaInput?.value || '');
      if (captchaAnswer !== captchaData.answer) {
        showError(CONFIG.LOGIN_ERROR_ID, '验证码错误，请重试');
        refreshCaptcha();
        return;
      }
    }

    setButtonLoading(CONFIG.LOGIN_BTN_ID, true, '登录');
    showError(CONFIG.LOGIN_ERROR_ID, '');

    const result = await SharedAuth.login(username, password);

    setButtonLoading(CONFIG.LOGIN_BTN_ID, false, '登录');

    if (result.success) {
      loginErrorCount = 0;
      close();
      // 触发全局通知
      if (window.onAuthSuccess) {
        window.onAuthSuccess(result.data);
      }
    } else {
      loginErrorCount++;
      if (loginErrorCount >= MAX_ERROR_COUNT) {
        showCaptchaSection();
        showError(CONFIG.LOGIN_ERROR_ID, result.message || '登录失败，请输入验证码继续');
      } else {
        showError(CONFIG.LOGIN_ERROR_ID, `${result.message || '登录失败'}（第${loginErrorCount}次错误，再错${MAX_ERROR_COUNT - loginErrorCount}次将启用验证码）`);
      }
    }
  }

  // ==================== 注册处理 ====================
  async function handleRegister() {
    const usernameInput = document.getElementById('zhihr-register-username');
    const passwordInput = document.getElementById('zhihr-register-password');
    const passwordConfirmInput = document.getElementById('zhihr-register-password-confirm');
    const captchaInput = document.getElementById('zhihr-captcha-input');

    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value || '';
    const passwordConfirm = passwordConfirmInput?.value || '';

    const validation = validateRegister(username, password, passwordConfirm);
    if (!validation.valid) {
      showError(CONFIG.REGISTER_ERROR_ID, validation.message);
      return;
    }

    // 如果达到错误次数阈值，需要验证验证码
    if (shouldShowCaptcha()) {
      const captchaAnswer = parseInt(captchaInput?.value || '');
      if (captchaAnswer !== captchaData.answer) {
        showError(CONFIG.REGISTER_ERROR_ID, '验证码错误，请重试');
        refreshCaptcha();
        return;
      }
    }

    setButtonLoading(CONFIG.REGISTER_BTN_ID, true, '注册');
    showError(CONFIG.REGISTER_ERROR_ID, '');

    const result = await SharedAuth.register(username, password);

    setButtonLoading(CONFIG.REGISTER_BTN_ID, false, '注册');

    if (result.success) {
      registerErrorCount = 0;
      close();
      // 触发全局通知
      if (window.onAuthSuccess) {
        window.onAuthSuccess(result.data);
      }
    } else {
      registerErrorCount++;
      if (registerErrorCount >= MAX_ERROR_COUNT) {
        showCaptchaSection();
        showError(CONFIG.REGISTER_ERROR_ID, result.message || '注册失败，请输入验证码继续');
      } else {
        showError(CONFIG.REGISTER_ERROR_ID, `${result.message || '注册失败'}（第${registerErrorCount}次错误，再错${MAX_ERROR_COUNT - registerErrorCount}次将启用验证码）`);
      }
    }
  }

  // ==================== 显示验证码区域 ====================
  function showCaptchaSection() {
    const sectionId = currentMode === 'login' ? 'zhihr-captcha-section' : 'zhihr-captcha-section-reg';
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('hidden');
    }
    refreshCaptcha();
  }

  // ==================== 验证码刷新 ====================
  function refreshCaptcha() {
    captchaData = generateCaptcha();
    ['zhihr-captcha-question', 'zhihr-captcha-question-reg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = captchaData.question;
    });
    ['zhihr-captcha-input', 'zhihr-captcha-input-reg'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
  }

  // ==================== 模式切换 ====================
  function toggleMode(mode) {
    currentMode = mode;
    
    const loginForm = document.getElementById(CONFIG.LOGIN_FORM_ID);
    const registerForm = document.getElementById(CONFIG.REGISTER_FORM_ID);
    const loginError = document.getElementById(CONFIG.LOGIN_ERROR_ID);
    const registerError = document.getElementById(CONFIG.REGISTER_ERROR_ID);
    const modalTitle = document.getElementById('zhihr-auth-modal-title');

    if (mode === 'login') {
      if (loginForm) loginForm.classList.remove('hidden');
      if (registerForm) registerForm.classList.add('hidden');
      if (loginError) loginError.classList.add('hidden');
      if (registerError) registerError.classList.add('hidden');
      if (modalTitle) modalTitle.textContent = '登录';
    } else {
      if (loginForm) loginForm.classList.add('hidden');
      if (registerForm) registerForm.classList.remove('hidden');
      if (loginError) loginError.classList.add('hidden');
      if (registerError) registerError.classList.add('hidden');
      if (modalTitle) modalTitle.textContent = '注册';
    }

    // 根据错误次数决定是否显示验证码
    const showCaptcha = shouldShowCaptcha();
    const captchaContainer = document.getElementById('zhihr-captcha-section');
    const captchaContainerReg = document.getElementById('zhihr-captcha-section-reg');
    
    if (captchaContainer) {
      captchaContainer.classList.toggle('hidden', !showCaptcha);
    }
    if (captchaContainerReg) {
      captchaContainerReg.classList.toggle('hidden', !showCaptcha);
    }

    // 清空表单
    const inputs = document.querySelectorAll(`#${CONFIG.MODAL_ID} input`);
    inputs.forEach(input => {
      if (input.type !== 'hidden') {
        input.value = '';
      }
    });
    refreshCaptcha();

    // 聚焦到第一个输入框
    setTimeout(() => {
      const focusInput = mode === 'login' 
        ? document.getElementById('zhihr-login-username')
        : document.getElementById('zhihr-register-username');
      if (focusInput) {
        focusInput.focus();
      }
    }, 100);
  }

  // ==================== 弹窗控制 ====================
  function open(mode = 'login') {
    if (!SharedAuth || !SharedAuth.isAuthenticated?.()) {
      // 如果已经登录，直接关闭
      if (SharedAuth?.isAuthenticated?.()) {
        return;
      }
    }

    currentMode = mode;
    isOpen = true;

    let modal = document.getElementById(CONFIG.MODAL_ID);
    
    if (!modal) {
      // 创建弹窗
      modal = createModalHTML();
      document.body.appendChild(modal);
    }

    modal.classList.add('active');
    toggleMode(mode);

    // 初始化 Lucide 图标
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // 绑定事件
    bindEvents();

    // 聚焦到第一个输入框
    setTimeout(() => {
      const focusInput = mode === 'login' 
        ? document.getElementById('zhihr-login-username')
        : document.getElementById('zhihr-register-username');
      if (focusInput) {
        focusInput.focus();
      }
    }, 100);
  }

  function close() {
    const modal = document.getElementById(CONFIG.MODAL_ID);
    if (modal) {
      modal.classList.remove('active');
    }
    isOpen = false;
  }

  // ==================== 创建弹窗 HTML ====================
  function createModalHTML() {
    const div = document.createElement('div');
    div.id = CONFIG.MODAL_ID;
    div.className = 'modal-overlay';
    div.innerHTML = `
      <div class="modal bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl p-8 w-[420px] max-w-[90vw] mx-auto transition-all duration-300">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600 dark:text-blue-400">
              <circle cx="12" cy="5" r="1"/>
              <path d="m9 20 3-6 3 6"/>
              <path d="m6 8 6 2 6-2"/>
              <path d="M12 10v4"/>
            </svg>
            <h2 id="zhihr-auth-modal-title" class="text-xl font-semibold text-slate-800 dark:text-slate-100">登录</h2>
          </div>
          <button onclick="AuthModal.close()" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- 登录表单 -->
        <div id="${CONFIG.LOGIN_FORM_ID}" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">账号</label>
            <input type="text" id="zhihr-login-username" placeholder="输入账号"
              class="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              onkeypress="if(event.key==='Enter'){document.getElementById('zhihr-login-password').focus();}">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">密码</label>
            <input type="password" id="zhihr-login-password" placeholder="输入密码"
              class="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              onkeypress="if(event.key==='Enter'){handleLogin();}">
          </div>
          <!-- 验证码 -->
          <div id="zhihr-captcha-section" class="flex items-center gap-3 hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md">
              <span id="zhihr-captcha-question" class="text-sm font-medium text-slate-800 dark:text-slate-200">${captchaData.question}</span>
              <button type="button" onclick="refreshCaptcha()" class="p-1 text-slate-500 hover:text-blue-600 cursor-pointer rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="刷新验证码">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
              </button>
            </div>
            <input type="number" id="zhihr-captcha-input" placeholder="答案"
              class="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onkeypress="if(event.key==='Enter'){handleLogin();}">
          </div>
          <div id="${CONFIG.LOGIN_ERROR_ID}" class="text-sm text-red-500 hidden"></div>
          <button id="${CONFIG.LOGIN_BTN_ID}" onclick="handleLogin()" class="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0 active:shadow-md transition-all duration-200 cursor-pointer text-sm">
            登录
          </button>
          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            没有账号？<a href="#" onclick="AuthModal.open('register');return false;" class="text-blue-600 hover:underline font-medium">注册新账号</a>
          </p>
        </div>

        <!-- 注册表单 -->
        <div id="${CONFIG.REGISTER_FORM_ID}" class="space-y-4 hidden">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">账号</label>
            <input type="text" id="zhihr-register-username" placeholder="设置账号（至少3位）" minlength="3"
              class="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">密码</label>
            <input type="password" id="zhihr-register-password" placeholder="设置密码（至少4位）" minlength="4"
              class="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200">
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">确认密码</label>
            <input type="password" id="zhihr-register-password-confirm" placeholder="再次输入密码"
              class="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              onkeypress="if(event.key==='Enter'){handleRegister();}">
          </div>
          <!-- 验证码 -->
          <div id="zhihr-captcha-section-reg" class="flex items-center gap-3 hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-md">
              <span id="zhihr-captcha-question-reg" class="text-sm font-medium text-slate-800 dark:text-slate-200">${captchaData.question}</span>
              <button type="button" onclick="refreshCaptcha()" class="p-1 text-slate-500 hover:text-blue-600 cursor-pointer rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="刷新验证码">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 2v6h-6"></path>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                  <path d="M3 22v-6h6"></path>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
                </svg>
              </button>
            </div>
            <input type="number" id="zhihr-captcha-input-reg" placeholder="答案"
              class="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              onkeypress="if(event.key==='Enter'){handleRegister();}">
          </div>
          <div id="${CONFIG.REGISTER_ERROR_ID}" class="text-sm text-red-500 hidden"></div>
          <button id="${CONFIG.REGISTER_BTN_ID}" onclick="handleRegister()" class="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/25 active:translate-y-0 active:shadow-md transition-all duration-200 cursor-pointer text-sm">
            注册
          </button>
          <p class="text-center text-sm text-slate-500 dark:text-slate-400">
            已有账号？<a href="#" onclick="AuthModal.open('login');return false;" class="text-blue-600 hover:underline font-medium">登录</a>
          </p>
        </div>
      </div>
    `;

    return div;
  }

  // ==================== 绑定事件 ====================
  function bindEvents() {
    const modal = document.getElementById(CONFIG.MODAL_ID);
    if (!modal) return;

    // 点击遮罩层关闭
    modal.onclick = function(e) {
      if (e.target === modal) {
        close();
      }
    };

    // ESC 键关闭
    const escHandler = function(e) {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // 存储处理器引用以便移除
    modal._escHandler = escHandler;
  }

  // ==================== 初始化 ====================
  function init() {
    // 确保 SharedAuth 已初始化
    if (window.SharedAuth && !window.SharedAuth.getUser()?.isAuthenticated) {
      SharedAuth.init();
    }

    // 监听认证状态变化
    if (SharedAuth) {
      SharedAuth.on('auth:login', () => {
        close();
      });
    }

    console.log('[AuthModal] Initialized');
  }

  // ==================== 公共 API ====================
  window.AuthModal = {
    init,
    open,
    close,
    toggleMode,
    refreshCaptcha,
    handleLogin,
    handleRegister,
    getConfig: () => ({ ...CONFIG }),
  };

  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;

})();
