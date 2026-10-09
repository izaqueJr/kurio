import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Swiper, SwiperSlide } from "swiper/react";
import type { Swiper as SwiperInstance } from "swiper";
import { A11y, Keyboard } from "swiper/modules";
import "swiper/css";
import { eth, type Nft } from "../domain";
import { ASSETS } from "./layout";

type CarouselItem = Pick<Nft, "id" | "name" | "token" | "image" | "price">;

/**
 * Carrossel de produtos (Swiper): 2 itens por vez no mobile, 3 no tablet e 5 no desktop,
 * arrastar com mouse/toque, setas do teclado e dots de paginação no estilo do Figma.
 * `prefix` reaproveita as classes visuais de cada tela (ex.: "detail-related", "cart-related").
 */
export function ProductCarousel({ items, prefix, label }: { items: CarouselItem[]; prefix: string; label: string }) {
  const [swiper, setSwiper] = useState<SwiperInstance>();
  const [pages, setPages] = useState(0);
  const [active, setActive] = useState(0);
  const sync = (instance: SwiperInstance) => {
    setPages(instance.snapGrid.length);
    setActive(instance.snapIndex);
  };
  if (!items.length) return null;
  return (
    <>
      <div className={`${prefix}__viewport product-carousel`}>
        <Swiper
          modules={[A11y, Keyboard]}
          slidesPerView={2}
          slidesPerGroup={2}
          spaceBetween={16}
          breakpoints={{
            601: { slidesPerView: 3, slidesPerGroup: 3, spaceBetween: 20 },
            901: { slidesPerView: 5, slidesPerGroup: 5, spaceBetween: 28 },
          }}
          grabCursor
          keyboard={{ enabled: true, onlyInViewport: true }}
          a11y={{
            containerMessage: label,
            containerRoleDescriptionMessage: "carrossel",
            itemRoleDescriptionMessage: "item",
            slideLabelMessage: "{{index}} de {{slidesLength}}",
          }}
          onSwiper={(instance) => {
            setSwiper(instance);
            sync(instance);
          }}
          onSlideChange={sync}
          onSnapGridLengthChange={sync}
          onBreakpoint={sync}
        >
          {items.map((item) => (
            <SwiperSlide key={item.id}>
              <Link to="/nft/$nftId" params={{ nftId: item.id }} className={`${prefix}-card`} draggable={false}>
                <div className={`${prefix}-card__image`}>
                  <img
                    src={`${ASSETS}/${item.image}`}
                    alt={`${item.name} ${item.token}`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
                <div>
                  <p>
                    {item.name} {item.token}
                  </p>
                  <strong>{eth(item.price)}</strong>
                </div>
              </Link>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      {pages > 1 && (
        <div className={`${prefix}__dots`} role="group" aria-label={`Navegação: ${label}`}>
          {Array.from({ length: pages }, (_, index) => (
            <button
              type="button"
              key={index}
              className={index === active ? "is-active" : ""}
              aria-current={index === active ? "true" : undefined}
              aria-label={`Ver página ${index + 1} de ${pages}`}
              onClick={() => swiper?.slideTo(Math.min(index * Number(swiper.params.slidesPerGroup ?? 1), swiper.slides.length - 1))}
            />
          ))}
        </div>
      )}
    </>
  );
}
