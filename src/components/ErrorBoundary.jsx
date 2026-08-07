import { Component } from 'react';

/**
 * Xato ushlagich.
 *
 * React'da komponent xatosi ushlanmasa BUTUN daraxt o'chadi —
 * foydalanuvchi qora ekran ko'radi va nima bo'lganini bilmaydi.
 *
 * Telegram WebApp ichida brauzer konsoli ochilmaydi, shuning uchun
 * xato matni shu yerda ko'rsatiladi: foydalanuvchi "Xato tafsiloti"
 * ni ochib nusxa oladi va yuboradi. Aks holda nosozlikni topib
 * bo'lmaydi — faqat "nimadir ishlamayapti" degan xabar keladi.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null, open: false, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
    this.setState({ stack: info?.componentStack || null });
  }

  /** Yuborish uchun bir bo'lak matn. */
  report() {
    const e = this.state.error;
    return [
      `Xato: ${e?.name || 'Error'}: ${e?.message || String(e)}`,
      `Sahifa: ${window.location.pathname}${window.location.search}`,
      `Vaqt: ${new Date().toISOString()}`,
      e?.stack ? `\n${e.stack}` : '',
      this.state.stack ? `\nKomponent:${this.state.stack}` : '',
    ].filter(Boolean).join('\n');
  }

  copy = async () => {
    const text = this.report();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Telegram WebView'da clipboard API bloklangan bo'lishi mumkin
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error, open, copied } = this.state;
    const message = `${error?.name || 'Error'}: ${error?.message || String(error)}`;

    return (
      <div className="app-shell err-screen">
        <div className="err-screen__box">
          <div className="err-screen__icon">⚠️</div>
          <h2 className="err-screen__title">Nimadir noto&apos;g&apos;ri ketdi</h2>
          <p className="err-screen__text">
            Sahifani yuklashda xato yuz berdi. Qayta urinib ko&apos;ring.
          </p>

          <div className="err-screen__actions">
            <button
              onClick={() => { this.setState({ error: null, stack: null, open: false }); }}
              className="err-screen__btn err-screen__btn--primary"
            >
              Qayta urinish
            </button>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="err-screen__btn"
            >
              Bosh sahifa
            </button>
          </div>

          {/* Tafsilot — WebApp ichida ham ochiladi, aks holda
              xatoni aniqlab bo'lmaydi */}
          <button
            className="err-screen__toggle"
            onClick={() => this.setState({ open: !open })}
            aria-expanded={open}
          >
            {open ? 'Tafsilotni yashirish' : 'Xato tafsiloti'}
          </button>

          {open && (
            <div className="err-screen__report">
              <pre className="err-screen__detail">{this.report()}</pre>
              <button className="err-screen__btn err-screen__btn--copy" onClick={this.copy}>
                {copied ? 'Nusxa olindi ✓' : 'Nusxa olish'}
              </button>
              <p className="err-screen__hint">
                Shu matnni qo&apos;llab-quvvatlashga yuboring — nosozlik
                tezroq topiladi.
              </p>
            </div>
          )}

          <p className="err-screen__msg">{message}</p>
        </div>
      </div>
    );
  }
}
