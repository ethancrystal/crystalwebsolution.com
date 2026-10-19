import Reveal from '../Reveal';
import StitchedTitle from './StitchedTitle';
import { Pin } from './Pin';
import {
  CRYSTAL_DIGITIZING_URL,
  DIGITIZE_ITEMS,
  DIGITIZE_TAGS,
  PATCH_TILES,
  VECTOR_MOSAIC,
} from '../../lib/heritage.mjs';

// The digitize list is authored in narrow reading order (cap, monogram, towel,
// hat, sleeves, gloves). Wide screens read it as two stacks beside the artwork
// pair, so split by parity: left stack first, then the figure, then the right.
const LEFT_STACK = DIGITIZE_ITEMS.filter((_, i) => i % 2 === 0);
const RIGHT_STACK = DIGITIZE_ITEMS.filter((_, i) => i % 2 === 1);

function DigitizeItem({ item }) {
  const order = DIGITIZE_ITEMS.indexOf(item) + 1;
  return (
    <div className="hx-digitize-item" style={{ '--o': order }}>
      <h4>{item.title}</h4>
      <p>{item.body}</p>
    </div>
  );
}

// 03 What we make: one production mindset, several physical outputs. Editorial
// blocks, not equal cards: the root (Crystal Digitizing), what we digitize,
// patches by material, stickers and vector prep, then apparel as a quiet line.
export default function Make() {
  return (
    <section className="hx-section hx-make" id="make" aria-labelledby="hx-make-title">
      <Pin lane="l" top="45%" />
      <div className="hx-inner">
        <Reveal className="hx-head hx-make-head" y={28}>
          <div>
            <div className="hx-label">03 — What we make</div>
            <h2 className="hx-h2" id="hx-make-title" style={{ maxWidth: 760 }}>
              One production mindset.
              <br />
              <em>Several physical outputs.</em>
            </h2>
          </div>
          <p className="hx-aside">
            Every product starts the same way: a file prepared for the material, the size and the machine it will
            meet.
          </p>
        </Reveal>

        <Reveal className="hx-feature" y={28}>
          <figure style={{ margin: 0 }}>
            <div className="hx-feature-photo">
              <img
                src="/heritage/emb-parrots.webp"
                width="789"
                height="900"
                alt="Embroidered pair of scarlet macaws, shaded in thread"
                loading="lazy"
                decoding="async"
              />
              <div className="hx-feature-inset">
                <img
                  src="/heritage/emb-eagle.webp"
                  width="240"
                  height="240"
                  alt="Embroidered eagle head design with shaded feathers"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <figcaption className="hx-figcap">
              <span>STITCH SHADING / FINE DETAIL</span>
              <span>FIG. 01</span>
            </figcaption>
          </figure>
          <div className="hx-feature-copy">
            <div className="hx-label">The root / the file</div>
            <StitchedTitle
              id="hx-tt-crystal"
              label="Crystal Digitizing"
              lines={['Crystal', 'Digitizing']}
              box={[330, 180]}
              size={3.929}
            />
            <p>
              Embroidery digitizing from the team that has done it for sixteen years. Every file is planned for the
              fabric, the backing and the size it will actually be sewn at — then proven on the machine.
            </p>
            <ul className="hx-tags">
              {DIGITIZE_TAGS.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
            <div className="hx-links">
              <a className="hx-link" href="/services/embroidery-digitizing">
                Embroidery digitizing services <span className="hx-arrow" aria-hidden="true">→</span>
              </a>
              <a className="hx-link hx-link--ghost" href={CRYSTAL_DIGITIZING_URL} target="_blank" rel="noopener">
                Explore Crystal Digitizing <span className="hx-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal className="hx-digitize" y={28}>
          <div className="hx-digitize-head">
            <div>
              <div className="hx-label" style={{ letterSpacing: '0.2em', marginBottom: 18 }}>01 / By application</div>
              <StitchedTitle
                id="hx-tt-digitize"
                label="What we digitize"
                lines={['What we digitize']}
                box={[580, 100]}
                size={6.905}
                small
              />
            </div>
            <p className="hx-aside" style={{ maxWidth: 360 }}>
              One qualified digitizing department. Every file is punched to the requirements of what it will be sewn
              on.
            </p>
          </div>
          <div className="hx-digitize-grid">
            {LEFT_STACK.map((item) => <DigitizeItem key={item.title} item={item} />)}
            <figure className="hx-digitize-figure">
              <img
                src="/heritage/zarate-pair.webp"
                width="281"
                height="446"
                alt="Customer artwork for Zarate Brother's beside the finished embroidery design"
                loading="lazy"
                decoding="async"
              />
              <a className="hx-link" href={CRYSTAL_DIGITIZING_URL} target="_blank" rel="noopener">
                New customers register here <span className="hx-arrow" aria-hidden="true">→</span>
              </a>
            </figure>
            {RIGHT_STACK.map((item) => <DigitizeItem key={item.title} item={item} />)}
          </div>
        </Reveal>

        <Reveal className="hx-materials" y={28}>
          <div className="hx-materials-copy">
            <div className="hx-label">From the file / six materials</div>
            <StitchedTitle
              id="hx-tt-patches"
              label="Custom patches"
              lines={['Custom', 'patches']}
              box={[270, 180]}
              size={3.214}
            />
            <p>
              Embroidered, woven, PVC, leather, chenille and printed. Each material behaves differently on the
              machine and in the hand, so the file and the material are chosen together.
            </p>
            <div className="hx-links">
              <a className="hx-link" href="/services/custom-patches">
                Custom patches <span className="hx-arrow" aria-hidden="true">→</span>
              </a>
              <a className="hx-link hx-link--ghost" href="/#offer">
                See the current patch offer <span className="hx-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <ul className="hx-tiles">
            {PATCH_TILES.map((tile) => (
              <li key={tile.src} className="hx-tile">
                <figure style={{ margin: 0 }}>
                  <div className="hx-tile-img">
                    <img
                      className={tile.multiply ? 'is-multiply' : undefined}
                      src={tile.src}
                      width={tile.w}
                      height={tile.h}
                      alt={tile.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption>{tile.caption}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="hx-print" y={28}>
          <article>
            <div className="hx-print-media">
              <img
                src="/heritage/stickers.webp"
                width="240"
                height="240"
                alt="Custom sticker sample: a tiger mascot design"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="hx-label">From the file / print</div>
            <StitchedTitle
              id="hx-tt-stickers"
              label="Custom stickers"
              lines={['Custom stickers']}
              box={[540, 100]}
              size={6.429}
              small
            />
            <p>Artwork prepared for clean cut lines and accurate colour before anything is printed.</p>
          </article>
          <article>
            <div className="hx-print-media hx-mosaic">
              {VECTOR_MOSAIC.map((tile) => (
                <div key={tile.src} style={{ gridColumn: `span ${tile.span}` }}>
                  <img
                    className={tile.multiply ? 'is-multiply' : undefined}
                    src={tile.src}
                    width={tile.w}
                    height={tile.h}
                    alt={tile.alt}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
            <div className="hx-label">From the file / preparation</div>
            <StitchedTitle
              id="hx-tt-vector"
              label="Vector artwork & production prep"
              lines={['Vector artwork &', 'production prep']}
              box={[590, 180]}
              size={7.024}
              small
            />
            <p>
              Logos rebuilt as clean vector files, separated and sized for the method that will produce them.
            </p>
          </article>
        </Reveal>

        <Reveal className="hx-apparel" y={28}>
          <div className="hx-apparel-name">
            <span className="hx-label">05</span>
            <span>Apparel &amp; brand goods</span>
          </div>
          <span>
            Available on confirmed projects — <a href="/#contact">ask about your item</a>
          </span>
        </Reveal>
      </div>
    </section>
  );
}
