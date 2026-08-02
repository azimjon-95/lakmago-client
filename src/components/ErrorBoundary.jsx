import { Component } from 'react';

/**
 * Xato ushlagich.
 *
 * React'da komponent xatosi ushlanmasa BUTUN daraxt o'chadi —
 * foydalanuvchi qora ekran ko'radi va nima bo'lganini bilmaydi.
 *
 * Bu komponent xatoni ushlab tushunarli xabar ko'rsatadi va
 * qayta urinish imkonini beradi.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Konsolda to'liq ma'lumot — nosozlikni topish uchun
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

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
              onClick={() => { this.setState({ error: null }); }}
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

          {/* Ishlab chiqishda xato matni ko'rinadi */}
          {import.meta.env.DEV && (
            <pre className="err-screen__detail">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
