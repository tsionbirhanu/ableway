/**
 * ============================================================================
 * Ableway Voice & Accessibility Engine for Savanna
 * Spec: Accessible Voice-Assisted Learning & Employment Platform (SRS v1.0)
 * ============================================================================
 */

(() => {
  'use strict';

  // State Management
  const state = {
    interactionMode: 'voice-first', // 'voice-first' | 'screen-reader' | 'hybrid'
    suppressInAppTTS: false,
    speechRate: 1.0,
    contrastTheme: 'default',
    textSize: 'normal',
    isListening: false,
    isSpeaking: false,
    earconsEnabled: true,
  };

  // ------------------------------------------------------------------ Earcons (Web Audio API)
  class EarconEngine {
    constructor() {
      this.ctx = null;
    }

    getCtx() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    }

    play(type) {
      if (!state.earconsEnabled) return;
      const ctx = this.getCtx();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (type) {
          case 'listening-start':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
            osc.start(now);
            osc.stop(now + 0.18);
            break;

          case 'listening-stop':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(660, now);
            osc.frequency.exponentialRampToValueAtTime(330, now + 0.12);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            break;

          case 'success':
          case 'command-recognized':
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.08);
            osc.frequency.setValueAtTime(783.99, now + 0.16);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
            osc.start(now);
            osc.stop(now + 0.28);
            break;

          case 'error':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(180, now + 0.1);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
            break;

          case 'navigation':
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            break;
        }
      } catch (e) {
        // audio context blocked until interaction
      }
    }
  }

  const earcons = new EarconEngine();

  // ----------------------------------------------------------- ARIA Live Announcer
  let liveRegion = null;
  function announce(message, politeness = 'polite') {
    if (!liveRegion) {
      liveRegion = document.getElementById('ableway-live-announcer');
    }
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.textContent = '';
      setTimeout(() => {
        liveRegion.textContent = message;
      }, 50);
    }
  }

  // ------------------------------------------------------------- Speech Synthesis (TTS)
  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      state.isSpeaking = false;
    }
  }

  function speak(text, force = false) {
    return new Promise((resolve) => {
      // Announce via ARIA live region first so external screen readers read it
      announce(text);

      // If user is in screen-reader mode, suppress in-app speech to prevent dual-voice clash (FR-2.10)
      if (state.suppressInAppTTS && !force) {
        resolve();
        return;
      }

      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = state.speechRate;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      utterance.onstart = () => {
        state.isSpeaking = true;
      };

      utterance.onend = () => {
        state.isSpeaking = false;
        resolve();
      };

      utterance.onerror = () => {
        state.isSpeaking = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // ----------------------------------------------------------- Speech Recognition (STT)
  let recognition = null;
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognitionClass) {
    recognition = new SpeechRecognitionClass();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
  }

  function startListening() {
    if (!recognition) {
      showStatusPill('Speech recognition is not supported in this browser.', true);
      earcons.play('error');
      return;
    }

    if (state.isListening) {
      stopListening();
      return;
    }

    stopSpeaking();
    earcons.play('listening-start');
    state.isListening = true;
    updateMicButton(true);
    showStatusPill('Listening... Speak a command (e.g. "Help", "Week 10", "Score details")');

    try {
      recognition.start();
    } catch (e) {
      // already started
    }
  }

  function stopListening() {
    if (recognition && state.isListening) {
      recognition.stop();
      earcons.play('listening-stop');
      state.isListening = false;
      updateMicButton(false);
      hideStatusPill();
    }
  }

  if (recognition) {
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      handleVoiceCommand(transcript);
    };

    recognition.onerror = () => {
      state.isListening = false;
      updateMicButton(false);
      earcons.play('error');
      showStatusPill('Could not recognize speech. Please try again.', true);
      setTimeout(hideStatusPill, 3500);
    };

    recognition.onend = () => {
      state.isListening = false;
      updateMicButton(false);
    };
  }

  // ------------------------------------------------------------- Voice Commands Engine
  function handleVoiceCommand(rawTranscript) {
    const text = rawTranscript.toLowerCase().trim();
    showStatusPill(`"${rawTranscript}"`);

    // 1. Where am I (FR-2.2)
    if (text.includes('where am i') || text.includes('location')) {
      earcons.play('command-recognized');
      const weekActive = document.querySelector('.homepage-nav .nav-link.active');
      const weekLabel = weekActive ? weekActive.textContent.trim() : 'Week 10';
      speak(`You are on the Savanna Learner Dashboard. Course: WR 100, Fundamentals of Effective Communication. Active view is ${weekLabel}.`);
      return;
    }

    // 2. Help (FR-2.3)
    if (text.includes('help') || text.includes('what can i say') || text.includes('commands')) {
      earcons.play('command-recognized');
      speak('Available commands: Where am I, How am I doing, Next week, Previous week, Week number like Week 10, Score details, Toggle menu, Ask tutor, Slower, Faster, or Stop.');
      return;
    }

    // 3. How am I doing / Progress Summary (FR-5.2)
    if (text.includes('how am i doing') || text.includes('progress') || text.includes('status') || text.includes('my score')) {
      earcons.play('command-recognized');
      speak('Progress summary: Your current overall score is 59.56 percent. You are in week 10 of 15. Attendance is 100 percent. You have 3 immediate deliverables this week.');
      return;
    }

    // 4. Score Details Dialog
    if (text.includes('score details') || text.includes('show grades') || text.includes('view scores')) {
      earcons.play('command-recognized');
      const scoreBtn = document.querySelector('[data-bs-target^="#score_details"]') || document.querySelector('.score-details-btn');
      if (scoreBtn) {
        scoreBtn.click();
        speak('Opening score details modal. Week 10 overall score is 59.56%.');
      } else {
        speak('Your current score is 59.56%.');
      }
      return;
    }

    // 5. Week navigation ("Week 10", "Next week", "Previous week")
    const weekMatch = text.match(/week\s*(\d+)/i);
    if (weekMatch) {
      const targetWeek = weekMatch[1];
      const weekLinks = [...document.querySelectorAll('.homepage-nav .nav-link[data-track-id]')];
      const foundLink = weekLinks.find(link => link.textContent.includes(`W${targetWeek}`) || link.textContent.includes(`Week ${targetWeek}`));
      if (foundLink) {
        earcons.play('navigation');
        foundLink.click();
        speak(`Switched to Week ${targetWeek}.`);
        return;
      }
    }

    if (text.includes('next week')) {
      const active = document.querySelector('.homepage-nav .nav-link.active');
      const next = active && active.closest('li')?.nextElementSibling?.querySelector('.nav-link');
      if (next) {
        earcons.play('navigation');
        next.click();
        speak(`Switched to ${next.textContent.trim()}.`);
      } else {
        speak('You are already on the last week.');
      }
      return;
    }

    if (text.includes('previous week') || text.includes('prior week')) {
      const active = document.querySelector('.homepage-nav .nav-link.active');
      const prev = active && active.closest('li')?.previousElementSibling?.querySelector('.nav-link');
      if (prev) {
        earcons.play('navigation');
        prev.click();
        speak(`Switched to ${prev.textContent.trim()}.`);
      } else {
        speak('You are on the first week.');
      }
      return;
    }

    // 6. Toggle Sidebar / Menu
    if (text.includes('toggle menu') || text.includes('menu') || text.includes('sidebar')) {
      earcons.play('navigation');
      const hamburger = document.querySelector('.hamburger');
      if (hamburger) hamburger.click();
      speak('Navigation sidebar toggled.');
      return;
    }

    // 7. Ask AI Tutor / Socratic (FR-4.1)
    if (text.includes('ask tutor') || text.includes('tutor') || text.includes('socratic')) {
      earcons.play('command-recognized');
      openSocraticModal();
      speak('Opening Socratic AI tutor. Ask any question about Fundamentals of Effective Communication.');
      return;
    }

    // 8. Slower / Faster Speech
    if (text.includes('slower') || text.includes('slow down')) {
      state.speechRate = Math.max(0.6, +(state.speechRate - 0.2).toFixed(1));
      earcons.play('success');
      speak(`Speech rate decreased to ${state.speechRate}x.`);
      return;
    }

    if (text.includes('faster') || text.includes('speed up')) {
      state.speechRate = Math.min(2.0, +(state.speechRate + 0.2).toFixed(1));
      earcons.play('success');
      speak(`Speech rate increased to ${state.speechRate}x.`);
      return;
    }

    // 9. Stop
    if (text === 'stop' || text === 'cancel' || text === 'quiet') {
      earcons.play('listening-stop');
      stopSpeaking();
      stopListening();
      hideStatusPill();
      return;
    }

    // Unrecognized
    earcons.play('error');
    speak(`I did not understand "${rawTranscript}". Say "Help" to hear the list of commands.`);
  }

  // ------------------------------------------------------------- Status Pill Helper
  let statusTimeout = null;
  function showStatusPill(text, isError = false) {
    let pill = document.getElementById('ableway-status-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'ableway-status-pill';
      pill.className = 'ableway-status-pill';
      document.body.appendChild(pill);
    }
    pill.style.display = 'flex';
    pill.style.borderColor = isError ? '#e11d48' : '#34d399';
    pill.textContent = text;

    clearTimeout(statusTimeout);
    statusTimeout = setTimeout(hideStatusPill, 4000);
  }

  function hideStatusPill() {
    const pill = document.getElementById('ableway-status-pill');
    if (pill) pill.style.display = 'none';
  }

  function updateMicButton(listening) {
    const btn = document.getElementById('ableway-mic-trigger');
    if (btn) {
      btn.classList.toggle('is-listening', listening);
      btn.setAttribute('aria-label', listening ? 'Stop listening' : 'Start voice assistant');
      btn.setAttribute('aria-pressed', String(listening));
    }
  }

  // ------------------------------------------------------------- Socratic AI Tutor Modal
  function openSocraticModal() {
    let modal = document.getElementById('ableway-socratic-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ableway-socratic-modal';
      modal.className = 'ableway-modal-overlay';
      modal.innerHTML = `
        <div class="ableway-modal" role="dialog" aria-labelledby="socratic-title" aria-modal="true">
          <div class="ableway-modal-header">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: #059669; display: flex; align-items: center; justify-content: center;">
                <i class="fa-solid fa-robot" style="color: white; font-size: 1.1rem;"></i>
              </div>
              <div>
                <h3 id="socratic-title" style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #ffffff;">Socratic AI Tutor</h3>
                <span style="font-size: 0.75rem; color: #34d399;">Grounded in WR 100 Course Materials</span>
              </div>
            </div>
            <button id="close-socratic-btn" type="button" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer; padding: 0.25rem 0.5rem;" aria-label="Close tutor dialog">&times;</button>
          </div>

          <div class="ableway-modal-body" id="socratic-messages" style="display: flex; flex-direction: column; gap: 0.75rem; min-height: 220px;">
            <div style="background: rgba(5, 150, 105, 0.15); border: 1px solid rgba(5, 150, 105, 0.3); border-radius: 1rem; padding: 1rem; color: #f8fafc; font-size: 0.9rem; line-height: 1.5;">
              Hello Björn! I am your Socratic AI Tutor. Ask me any question about Week 10: Deliverables and Verbal Delivery, or say "Quiz me" to practice.
            </div>
          </div>

          <div class="ableway-modal-footer">
            <form id="socratic-form" style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" id="socratic-input" placeholder="Type or speak a question..." style="flex: 1; background: #020617; border: 1px solid #334155; border-radius: 0.75rem; padding: 0.65rem 1rem; color: white; font-size: 0.9rem; outline: none;" aria-label="Ask a question" />
              <button type="submit" style="background: #059669; border: none; border-radius: 0.75rem; color: white; padding: 0.65rem 1rem; font-weight: 600; cursor: pointer;" aria-label="Send question">Ask</button>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#close-socratic-btn').addEventListener('click', closeSocraticModal);
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSocraticModal();
      });

      modal.querySelector('#socratic-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const input = modal.querySelector('#socratic-input');
        const query = input.value.trim();
        if (!query) return;

        addSocraticMessage('user', query);
        input.value = '';

        // Response logic grounded in WR 100
        setTimeout(() => {
          let reply = `Regarding "${query}": In Week 10, structured verbal delivery relies on the three-point rule: state your premise, present supporting evidence, and provide a clear call to action.`;
          if (query.toLowerCase().includes('quiz')) {
            reply = 'Here is a quick check: What are the three parts of the three-point rule?';
          }
          addSocraticMessage('tutor', reply);
          speak(reply);
        }, 800);
      });
    }

    modal.style.display = 'flex';
    const input = modal.querySelector('#socratic-input');
    if (input) input.focus();
  }

  function closeSocraticModal() {
    const modal = document.getElementById('ableway-socratic-modal');
    if (modal) modal.style.display = 'none';
    stopSpeaking();
  }

  function addSocraticMessage(sender, text) {
    const stream = document.getElementById('socratic-messages');
    if (!stream) return;
    const msg = document.createElement('div');
    const isTutor = sender === 'tutor';
    msg.style.cssText = isTutor
      ? 'background: rgba(5, 150, 105, 0.15); border: 1px solid rgba(5, 150, 105, 0.3); border-radius: 1rem; padding: 0.9rem; color: #f8fafc; font-size: 0.9rem;'
      : 'background: #2563eb; align-self: flex-end; border-radius: 1rem; padding: 0.8rem 1rem; color: white; font-size: 0.9rem; max-width: 80%;';
    msg.textContent = text;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
  }

  // ------------------------------------------------------------- Injected UI Elements
  function injectAccessibleUI() {
    // 1. Skip link
    if (!document.querySelector('.ableway-skip-link')) {
      const skipLink = document.createElement('a');
      skipLink.className = 'ableway-skip-link';
      skipLink.href = '#content';
      skipLink.textContent = 'Skip to main content';
      document.body.prepend(skipLink);
    }

    // 2. ARIA Live Announcer
    if (!document.getElementById('ableway-live-announcer')) {
      const live = document.createElement('div');
      live.id = 'ableway-live-announcer';
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      live.style.cssText = 'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;';
      document.body.appendChild(live);
    }

    // 3. Floating Voice Assistant Button (FAB)
    if (!document.getElementById('ableway-voice-fab')) {
      const fab = document.createElement('div');
      fab.id = 'ableway-voice-fab';
      fab.className = 'ableway-voice-fab';
      fab.innerHTML = `
        <button id="ableway-a11y-menu-btn" class="ableway-a11y-toggle" type="button" aria-label="Accessibility Settings">
          <i class="fa-solid fa-universal-access"></i>
          <span>Voice & A11y</span>
        </button>

        <button id="ableway-mic-trigger" class="ableway-mic-btn" type="button" aria-label="Start voice assistant" aria-pressed="false" title="Click or press Space bar to speak">
          <i class="fa-solid fa-microphone" style="font-size: 1.4rem;"></i>
        </button>
      `;
      document.body.appendChild(fab);

      document.getElementById('ableway-mic-trigger').addEventListener('click', () => {
        if (state.isListening) stopListening();
        else startListening();
      });

      document.getElementById('ableway-a11y-menu-btn').addEventListener('click', toggleA11yDrawer);
    }

    // 4. Keyboard Shortcuts: Space for Push-to-Talk, H for Help, Esc to Stop
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing inside an input/textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        startListening();
      } else if (e.key === 'Escape') {
        stopSpeaking();
        stopListening();
        closeSocraticModal();
      } else if (e.key === 'h' || e.key === 'H') {
        handleVoiceCommand('help');
      }
    });

    window.addEventListener('keyup', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === 'Space') {
        setTimeout(stopListening, 300);
      }
    });
  }

  // ------------------------------------------------------------- Accessibility Drawer
  function toggleA11yDrawer() {
    let drawer = document.getElementById('ableway-a11y-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'ableway-a11y-drawer';
      drawer.className = 'ableway-modal-overlay';
      drawer.innerHTML = `
        <div class="ableway-modal" role="dialog" aria-labelledby="a11y-drawer-title" aria-modal="true" style="max-width: 440px;">
          <div class="ableway-modal-header">
            <h3 id="a11y-drawer-title" style="margin: 0; font-size: 1.1rem; font-weight: 700; color: white;">Accessibility Preferences</h3>
            <button id="close-a11y-drawer" type="button" style="background: transparent; border: none; color: #94a3b8; font-size: 1.25rem; cursor: pointer;" aria-label="Close accessibility settings">&times;</button>
          </div>
          <div class="ableway-modal-body" style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem;">Interaction Mode (FR-1.5)</label>
              <select id="mode-select" style="width: 100%; background: #020617; border: 1px solid #334155; border-radius: 0.5rem; padding: 0.6rem; color: white; font-size: 0.9rem;">
                <option value="voice-first">Voice-First (In-app audio guidance)</option>
                <option value="screen-reader">Screen Reader Mode (Suppresses in-app voice for NVDA)</option>
                <option value="hybrid">Hybrid (Voice input + Screen Reader)</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem;">Contrast Theme (IR-1.5)</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                <button type="button" class="theme-btn" data-theme="default" style="padding: 0.5rem; background: #020617; border: 1px solid #334155; color: white; border-radius: 0.5rem; font-size: 0.8rem; cursor: pointer;">Default</button>
                <button type="button" class="theme-btn" data-theme="high-contrast" style="padding: 0.5rem; background: #020617; border: 1px solid #334155; color: white; border-radius: 0.5rem; font-size: 0.8rem; cursor: pointer;">High Contrast</button>
                <button type="button" class="theme-btn" data-theme="dark-contrast" style="padding: 0.5rem; background: #000000; border: 1px solid #555555; color: white; border-radius: 0.5rem; font-size: 0.8rem; cursor: pointer;">Pure Black</button>
                <button type="button" class="theme-btn" data-theme="yellow-black" style="padding: 0.5rem; background: #000000; border: 1px solid #ffff00; color: #ffff00; border-radius: 0.5rem; font-size: 0.8rem; cursor: pointer;">Yellow on Black</button>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 0.5rem;">Voice Speed: <span id="rate-label">1.0x</span></label>
              <input type="range" id="rate-slider" min="0.6" max="2.0" step="0.1" value="1.0" style="width: 100%; accent-color: #059669;" />
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(drawer);

      drawer.querySelector('#close-a11y-drawer').addEventListener('click', () => {
        drawer.style.display = 'none';
      });
      drawer.addEventListener('click', (e) => {
        if (e.target === drawer) drawer.style.display = 'none';
      });

      const modeSelect = drawer.querySelector('#mode-select');
      modeSelect.value = state.interactionMode;
      modeSelect.addEventListener('change', (e) => {
        state.interactionMode = e.target.value;
        state.suppressInAppTTS = state.interactionMode === 'screen-reader';
        earcons.play('success');
        speak(`Switched to ${state.interactionMode} mode.`);
      });

      drawer.querySelectorAll('.theme-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.body.classList.remove('theme-high-contrast', 'theme-dark-contrast', 'theme-yellow-black');
          if (btn.dataset.theme !== 'default') {
            document.body.classList.add(`theme-${btn.dataset.theme}`);
          }
          state.contrastTheme = btn.dataset.theme;
          earcons.play('success');
        });
      });

      const rateSlider = drawer.querySelector('#rate-slider');
      const rateLabel = drawer.querySelector('#rate-label');
      rateSlider.addEventListener('input', (e) => {
        state.speechRate = parseFloat(e.target.value);
        rateLabel.textContent = `${state.speechRate}x`;
      });
    }
    drawer.style.display = 'flex';
  }

  // ------------------------------------------------------------- Enhance Savanna DOM
  function enhanceSavannaAccessibility() {
    // 1. Hamburger
    const hamburger = document.querySelector('.hamburger');
    if (hamburger) {
      hamburger.setAttribute('role', 'button');
      hamburger.setAttribute('tabindex', '0');
      hamburger.setAttribute('aria-label', 'Toggle navigation sidebar');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          hamburger.click();
        }
      });
    }

    // 2. Week navigation tabs
    const nav = document.querySelector('.homepage-nav');
    if (nav) {
      nav.setAttribute('role', 'tablist');
      nav.setAttribute('aria-label', 'Weekly curriculum navigation');
      nav.querySelectorAll('.nav-link').forEach((link) => {
        link.setAttribute('role', 'tab');
        link.setAttribute('tabindex', '0');
        const isActive = link.classList.contains('active');
        link.setAttribute('aria-selected', String(isActive));
      });
    }

    // 3. Make deliverable cards click-to-speak in Voice-First mode
    document.querySelectorAll('.deliverable-card, .homepage-deliverables .card, .curriculum-switcher-label').forEach((el) => {
      el.classList.add('ableway-speakable');
      el.setAttribute('tabindex', '0');
      el.addEventListener('click', () => {
        const text = el.innerText.trim();
        if (text) speak(text);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const text = el.innerText.trim();
          if (text) speak(text);
        }
      });
    });
  }

  // ------------------------------------------------------------- Initialization
  document.addEventListener('DOMContentLoaded', () => {
    injectAccessibleUI();
    enhanceSavannaAccessibility();

    // Spoken welcome on first load (FR-1.1)
    setTimeout(() => {
      speak('Welcome to Savanna Accessible Learning. Fundamentals of Effective Communication, Week 10. Press Space to speak a voice command, or say "Help".');
    }, 1000);
  });
})();

