import { CHANNELS } from "./landing.constants";
import { SocialIcons } from "./social-icons";

export function ChannelsSection() {
  return (
    <section className="channels" id="formatos">
      <div className="container">
        <p className="channels__label">
          Um estúdio, todos os formatos — sob medida para cada rede
        </p>
        <div className="channels__row">
          {CHANNELS.map((channel) => (
            <span key={channel}>{channel}</span>
          ))}
        </div>
        <p className="channels__note">
          Conteúdo otimizado para cada rede
        </p>
        <div className="logos" aria-label="Redes sociais suportadas">
          <SocialIcons />
        </div>
      </div>
    </section>
  );
}
