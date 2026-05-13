// 密码生成器 - 核心逻辑

// 字符集定义
const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
} as const;

// 配置类型
interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

// 强度等级
type StrengthLevel = 'weak' | 'medium' | 'strong' | 'very-strong';

// 强度评估结果
interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

/**
 * 生成随机密码
 */
export function generatePassword(config: PasswordConfig): string {
  const { length, includeUppercase, includeLowercase, includeNumbers, includeSymbols } = config;
  
  // 构建字符池
  let charPool = '';
  const requiredChars: string[] = [];
  
  if (includeUppercase) {
    charPool += CHAR_SETS.uppercase;
    requiredChars.push(getRandomChar(CHAR_SETS.uppercase));
  }
  if (includeLowercase) {
    charPool += CHAR_SETS.lowercase;
    requiredChars.push(getRandomChar(CHAR_SETS.lowercase));
  }
  if (includeNumbers) {
    charPool += CHAR_SETS.numbers;
    requiredChars.push(getRandomChar(CHAR_SETS.numbers));
  }
  if (includeSymbols) {
    charPool += CHAR_SETS.symbols;
    requiredChars.push(getRandomChar(CHAR_SETS.symbols));
  }
  
  // 如果没有选择任何字符类型，默认使用小写字母
  if (charPool.length === 0) {
    charPool = CHAR_SETS.lowercase;
  }
  
  // 生成密码
  let password = '';
  const remainingLength = length - requiredChars.length;
  
  // 填充剩余字符
  for (let i = 0; i < remainingLength; i++) {
    password += getRandomChar(charPool);
  }
  
  // 插入必需字符
  for (const char of requiredChars) {
    const insertPos = Math.floor(Math.random() * (password.length + 1));
    password = password.slice(0, insertPos) + char + password.slice(insertPos);
  }
  
  return password;
}

/**
 * 获取随机字符
 */
function getRandomChar(charset: string): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);
  return charset[randomValues[0] % charset.length];
}

/**
 * 评估密码强度
 */
export function evaluateStrength(password: string): StrengthResult {
  let score = 0;
  const suggestions: string[] = [];
  
  // 长度评分 (最高40分)
  const lengthScore = Math.min(password.length * 4, 40);
  score += lengthScore;
  
  if (password.length < 8) {
    suggestions.push('建议密码长度至少8位');
  } else if (password.length < 12) {
    suggestions.push('建议密码长度增加到12位以上');
  }
  
  // 字符多样性评分 (最高30分)
  let diversityScore = 0;
  if (/[a-z]/.test(password)) diversityScore += 7;
  if (/[A-Z]/.test(password)) diversityScore += 8;
  if (/[0-9]/.test(password)) diversityScore += 7;
  if (/[^a-zA-Z0-9]/.test(password)) diversityScore += 8;
  score += diversityScore;
  
  // 缺失字符类型提示
  if (!/[a-z]/.test(password)) suggestions.push('添加小写字母增强强度');
  if (!/[A-Z]/.test(password)) suggestions.push('添加大写字母增强强度');
  if (!/[0-9]/.test(password)) suggestions.push('添加数字增强强度');
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('添加特殊符号增强强度');
  
  // 熵值评分 (最高30分)
  const uniqueChars = new Set(password.split('')).size;
  const entropyScore = Math.min(uniqueChars * 2, 30);
  score += entropyScore;
  
  // 模式惩罚
  if (/(.)\1{2,}/.test(password)) {
    score -= 10;
    suggestions.push('避免连续重复字符');
  }
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    score -= 5;
    suggestions.push('避免连续字母序列');
  }
  if (/(?:012|123|234|345|456|567|678|789|890)/.test(password)) {
    score -= 5;
    suggestions.push('避免连续数字序列');
  }
  
  // 确保分数在0-100之间
  score = Math.max(0, Math.min(100, score));
  
  // 确定强度等级
  let level: StrengthLevel;
  let label: string;
  let color: string;
  
  if (score < 40) {
    level = 'weak';
    label = '弱';
    color = '#ef4444';
  } else if (score < 60) {
    level = 'medium';
    label = '中等';
    color = '#f59e0b';
  } else if (score < 80) {
    level = 'strong';
    label = '强';
    color = '#10b981';
  } else {
    level = 'very-strong';
    label = '非常强';
    color = '#06b6d4';
  }
  
  return {
    level,
    score,
    label,
    color,
    suggestions: suggestions.slice(0, 3) // 最多显示3条建议
  };
}

/**
 * 复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * 显示复制成功提示
 */
function showCopyToast(): void {
  // 移除已存在的toast
  const existingToast = document.querySelector('.copy-toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  toast.textContent = '✓ 密码已复制到剪贴板';
  document.body.appendChild(toast);
  
  // 显示动画
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });
  
  // 3秒后移除
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

/**
 * 初始化应用
 */
export function initApp(): void {
  const app = document.getElementById('app');
  
  if (!app) {
    console.error('App element not found');
    return;
  }
  
  // 初始配置
  let config: PasswordConfig = {
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true
  };
  
  let currentPassword = '';
  
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div class="w-full max-w-2xl">
        <!-- 标题区域 -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center gap-3 mb-4">
            <div class="indicator-light" style="color: var(--amber-primary);"></div>
            <h1 class="text-3xl md:text-4xl font-bold" style="color: var(--amber-light); font-family: 'Inter', sans-serif;">
              安全密码生成器
            </h1>
            <div class="indicator-light" style="color: var(--amber-primary);"></div>
          </div>
          <p class="text-base" style="color: var(--muted-foreground);">
            生成高强度随机密码，保护您的账户安全
          </p>
        </div>
        
        <!-- 主卡片 -->
        <div class="card mb-6">
          <!-- 密码显示区 -->
          <div class="mb-6">
            <label class="block text-sm font-medium mb-3" style="color: var(--muted-foreground);">
              生成的密码
            </label>
            <div class="password-display" id="passwordDisplay">
              <span id="passwordText" style="color: var(--amber-light);">点击生成按钮开始</span>
            </div>
          </div>
          
          <!-- 强度指示器 -->
          <div class="mb-6" id="strengthSection" style="display: none;">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm" style="color: var(--muted-foreground);">密码强度</span>
              <span class="text-sm font-medium" id="strengthLabel">--</span>
            </div>
            <div class="strength-bar">
              <div class="strength-fill" id="strengthFill" style="width: 0%;"></div>
            </div>
            <div id="suggestionsContainer" class="mt-3 text-sm" style="color: var(--muted-foreground);"></div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="flex gap-3">
            <button class="btn-primary flex-1" id="generateBtn">
              <span class="flex items-center justify-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
                生成密码
              </span>
            </button>
            <button class="btn-secondary" id="copyBtn" disabled>
              <span class="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                复制
              </span>
            </button>
          </div>
        </div>
        
        <!-- 配置卡片 -->
        <div class="card">
          <h2 class="text-lg font-semibold mb-6" style="color: var(--foreground);">密码配置</h2>
          
          <!-- 长度设置 -->
          <div class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <label class="text-sm font-medium" style="color: var(--muted-foreground);">密码长度</label>
              <span class="text-lg font-mono font-bold" id="lengthValue" style="color: var(--amber-primary);">16</span>
            </div>
            <input 
              type="range" 
              id="lengthSlider" 
              min="8" 
              max="64" 
              value="16" 
              class="w-full"
            />
            <div class="flex justify-between text-xs mt-1" style="color: var(--muted-foreground);">
              <span>8位</span>
              <span>64位</span>
            </div>
          </div>
          
          <!-- 字符类型选择 -->
          <div>
            <label class="block text-sm font-medium mb-3" style="color: var(--muted-foreground);">
              字符类型
            </label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label class="char-type-label selected" id="uppercaseLabel">
                <label class="checkbox-wrapper">
                  <input type="checkbox" id="uppercase" checked />
                  <span class="checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                </label>
                <div>
                  <div class="font-medium">大写字母</div>
                  <div class="text-xs font-mono" style="color: var(--muted-foreground);">A-Z</div>
                </div>
              </label>
              
              <label class="char-type-label selected" id="lowercaseLabel">
                <label class="checkbox-wrapper">
                  <input type="checkbox" id="lowercase" checked />
                  <span class="checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                </label>
                <div>
                  <div class="font-medium">小写字母</div>
                  <div class="text-xs font-mono" style="color: var(--muted-foreground);">a-z</div>
                </div>
              </label>
              
              <label class="char-type-label selected" id="numbersLabel">
                <label class="checkbox-wrapper">
                  <input type="checkbox" id="numbers" checked />
                  <span class="checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                </label>
                <div>
                  <div class="font-medium">数字</div>
                  <div class="text-xs font-mono" style="color: var(--muted-foreground);">0-9</div>
                </div>
              </label>
              
              <label class="char-type-label selected" id="symbolsLabel">
                <label class="checkbox-wrapper">
                  <input type="checkbox" id="symbols" checked />
                  <span class="checkbox-custom">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                </label>
                <div>
                  <div class="font-medium">特殊符号</div>
                  <div class="text-xs font-mono" style="color: var(--muted-foreground);">!@#$%^&*</div>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <!-- 页脚 -->
        <div class="text-center mt-6 text-sm" style="color: var(--muted-foreground);">
          <p>使用加密安全随机数生成器 • 本地生成，不上传服务器</p>
        </div>
      </div>
    </div>
  `;
  
  // 获取DOM元素
  const passwordText = document.getElementById('passwordText') as HTMLElement;
  const strengthSection = document.getElementById('strengthSection') as HTMLElement;
  const strengthFill = document.getElementById('strengthFill') as HTMLElement;
  const strengthLabel = document.getElementById('strengthLabel') as HTMLElement;
  const suggestionsContainer = document.getElementById('suggestionsContainer') as HTMLElement;
  const lengthSlider = document.getElementById('lengthSlider') as HTMLInputElement;
  const lengthValue = document.getElementById('lengthValue') as HTMLElement;
  const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
  const copyBtn = document.getElementById('copyBtn') as HTMLButtonElement;
  
  const uppercaseCheckbox = document.getElementById('uppercase') as HTMLInputElement;
  const lowercaseCheckbox = document.getElementById('lowercase') as HTMLInputElement;
  const numbersCheckbox = document.getElementById('numbers') as HTMLInputElement;
  const symbolsCheckbox = document.getElementById('symbols') as HTMLInputElement;
  
  const uppercaseLabel = document.getElementById('uppercaseLabel') as HTMLElement;
  const lowercaseLabel = document.getElementById('lowercaseLabel') as HTMLElement;
  const numbersLabel = document.getElementById('numbersLabel') as HTMLElement;
  const symbolsLabel = document.getElementById('symbolsLabel') as HTMLElement;
  
  // 更新配置
  function updateConfig(): void {
    config = {
      length: parseInt(lengthSlider.value, 10),
      includeUppercase: uppercaseCheckbox.checked,
      includeLowercase: lowercaseCheckbox.checked,
      includeNumbers: numbersCheckbox.checked,
      includeSymbols: symbolsCheckbox.checked
    };
  }
  
  // 更新字符类型标签样式
  function updateCharTypeLabels(): void {
    uppercaseLabel.classList.toggle('selected', uppercaseCheckbox.checked);
    lowercaseLabel.classList.toggle('selected', lowercaseCheckbox.checked);
    numbersLabel.classList.toggle('selected', numbersCheckbox.checked);
    symbolsLabel.classList.toggle('selected', symbolsCheckbox.checked);
  }
  
  // 更新强度显示
  function updateStrengthDisplay(result: StrengthResult): void {
    strengthSection.style.display = 'block';
    strengthFill.style.width = `${result.score}%`;
    strengthFill.style.background = result.color;
    strengthLabel.textContent = `${result.label} (${result.score}分)`;
    strengthLabel.style.color = result.color;
    
    // 显示建议
    if (result.suggestions.length > 0) {
      suggestionsContainer.innerHTML = result.suggestions.map(s => 
        `<div class="flex items-center gap-2"><span>•</span><span>${s}</span></div>`
      ).join('');
    } else {
      suggestionsContainer.innerHTML = `<div class="flex items-center gap-2" style="color: var(--success);"><span>✓</span><span>密码强度良好</span></div>`;
    }
  }
  
  // 生成密码
  function generate(): void {
    updateConfig();
    
    // 确保至少选择一种字符类型
    if (!config.includeUppercase && !config.includeLowercase && 
        !config.includeNumbers && !config.includeSymbols) {
      config.includeLowercase = true;
      lowercaseCheckbox.checked = true;
      updateCharTypeLabels();
    }
    
    currentPassword = generatePassword(config);
    passwordText.textContent = currentPassword;
    passwordText.style.color = 'var(--amber-light)';
    
    // 评估强度
    const strengthResult = evaluateStrength(currentPassword);
    updateStrengthDisplay(strengthResult);
    
    // 启用复制按钮
    copyBtn.disabled = false;
    
    // 添加生成动画
    passwordText.style.opacity = '0';
    passwordText.style.transform = 'translateY(-10px)';
    requestAnimationFrame(() => {
      passwordText.style.transition = 'all 0.3s ease';
      passwordText.style.opacity = '1';
      passwordText.style.transform = 'translateY(0)';
    });
  }
  
  // 复制密码
  async function copyPassword(): Promise<void> {
    if (!currentPassword) return;
    
    const success = await copyToClipboard(currentPassword);
    if (success) {
      showCopyToast();
      
      // 按钮反馈动画
      copyBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        copyBtn.style.transform = 'scale(1)';
      }, 150);
    }
  }
  
  // 事件监听
  generateBtn.addEventListener('click', generate);
  copyBtn.addEventListener('click', copyPassword);
  
  lengthSlider.addEventListener('input', () => {
    lengthValue.textContent = lengthSlider.value;
  });
  
  // 字符类型复选框事件
  const checkboxes = [uppercaseCheckbox, lowercaseCheckbox, numbersCheckbox, symbolsCheckbox];
  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      updateCharTypeLabels();
      
      // 如果当前有密码，自动重新生成
      if (currentPassword) {
        generate();
      }
    });
  });
  
  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + G 生成密码
    if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
      e.preventDefault();
      generate();
    }
    // Ctrl/Cmd + C 复制（仅当焦点不在输入框时）
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && currentPassword) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
        copyPassword();
      }
    }
  });
}
