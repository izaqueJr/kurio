import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from './ui/button'

const ASSETS = '/assets/figma'

function FigmaIcon({ name, alt = '' }: { name: string; alt?: string }) {
  return <img src={`${ASSETS}/${name}`} alt={alt} width={32} height={32} loading="lazy" />
}

/** Itens editoriais/suporte estão fora do escopo: aparecem como no Figma, mas sinalizados como indisponíveis. */
function Unavailable({ children }: { children: string }) {
  return (
    <span className="footer-unavailable" aria-disabled="true" title="Indisponível nesta demonstração">
      {children}
    </span>
  )
}

const MOBILE_QUERY = '(max-width: 600px)'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches)
  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return mobile
}

/**
 * Grupo de links do rodapé: no desktop é uma coluna aberta (como no Figma); no mobile vira um
 * acordeão nativo (<details>/<summary>), fechado por padrão, para o rodapé não ficar longo demais.
 */
function FooterGroup({ id, title, mobile, children }: { id: string; title: string; mobile: boolean; children: ReactNode }) {
  if (!mobile) {
    return (
      <nav aria-labelledby={id}>
        <h2 id={id}>{title}</h2>
        {children}
      </nav>
    )
  }
  return (
    <details className="footer-group">
      <summary>
        <h2 id={id}>{title}</h2>
      </summary>
      <nav aria-labelledby={id}>{children}</nav>
    </details>
  )
}

const socials = [
  { icon: 'social-facebook.svg', label: 'Facebook', href: 'https://www.facebook.com/' },
  { icon: 'social-instagram.svg', label: 'Instagram', href: 'https://www.instagram.com/' },
  { icon: 'social-twitter.svg', label: 'X (Twitter)', href: 'https://x.com/' },
  { icon: 'social-linkedin.svg', label: 'LinkedIn', href: 'https://www.linkedin.com/' },
  { icon: 'social-youtube.svg', label: 'YouTube', href: 'https://www.youtube.com/' },
]

const collections = ['Arte digital', 'Fotografia', 'Música', 'Arte 3D', 'Utilidade']

export function SiteFooter() {
  const mobile = useIsMobile()
  const [newsletter, setNewsletter] = useState<{ tone: 'error' | 'info'; message: string } | null>(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim()
    setNewsletter(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? { tone: 'info', message: 'A newsletter não faz parte desta demonstração: nenhum e-mail foi cadastrado.' }
        : { tone: 'error', message: 'Informe um e-mail válido.' },
    )
  }
  return (
    <footer className="site-footer">
      <section className="footer-top">
        <div className="footer-benefit"><span aria-hidden="true">W</span><h2>Segurança da carteira</h2><p>Proteja sua carteira e colecione arte digital verificada com confiança.</p></div>
        <div className="footer-benefit"><span aria-hidden="true">C</span><h2>Criadores em destaque</h2><p>Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.</p></div>
        <div className="footer-benefit"><span aria-hidden="true">D</span><h2>Alertas de lançamentos</h2><p>Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.</p></div>
        <div className="newsletter">
          <h2>Antecipe-se ao próximo lançamento</h2>
          <form onSubmit={submit} noValidate>
            <input
              type="email"
              name="email"
              aria-label="Seu e-mail"
              placeholder="digite seu e-mail..."
              aria-invalid={newsletter?.tone === 'error' ? true : undefined}
              aria-describedby={newsletter ? 'newsletter-feedback' : undefined}
            />
            <Button type="submit" size="sm">Enviar</Button>
          </form>
          {newsletter ? (
            <p id="newsletter-feedback" role={newsletter.tone === 'error' ? 'alert' : 'status'} className="newsletter__feedback">{newsletter.message}</p>
          ) : (
            <p>Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          )}
        </div>
      </section>
      <section className="footer-contact">
        <b>KURIO</b>
        <p>Feito para colecionadores,<br />criadores e cultura</p>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </section>
      <section className="footer-links">
        <FooterGroup id="footer-profile" title="Meu perfil" mobile={mobile}>
          <Link to="/perfil">Meu perfil</Link>
          <Link to="/carteiras">Minha coleção</Link>
          <Unavailable>Atividade</Unavailable>
          <Unavailable>Estúdio do criador</Unavailable>
          <Link to="/favoritos">Lista de interesse</Link>
        </FooterGroup>
        <FooterGroup id="footer-help" title="Central de ajuda" mobile={mobile}>
          <Unavailable>Central de ajuda</Unavailable>
          <Unavailable>Como comprar NFTs</Unavailable>
          <Unavailable>Carteira e segurança</Unavailable>
          <Unavailable>Política do mercado</Unavailable>
          <Unavailable>Denunciar item</Unavailable>
        </FooterGroup>
        <FooterGroup id="footer-collections" title="Coleções" mobile={mobile}>
          {collections.map((category) => (
            <Link key={category} to="/" search={{ category }} hash="mercado">{category}</Link>
          ))}
        </FooterGroup>
        <div className="footer-social">
          <h2>Redes sociais</h2>
          <div>
            {socials.map(({ icon, label, href }) => (
              <a href={href} key={icon} target="_blank" rel="noreferrer noopener" aria-label={`${label} (abre em nova aba)`}>
                <FigmaIcon name={icon} />
              </a>
            ))}
          </div>
          <h2>Carteiras compatíveis</h2>
          <p>METAMASK&nbsp; • &nbsp;WALLETCONNECT&nbsp; • &nbsp;COINBASE</p>
        </div>
      </section>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
