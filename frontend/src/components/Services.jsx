import SectionHead from "./SectionHead.jsx";
import Icon from "./Icon.jsx";

export default function Services({ services, settings }) {
  if (services.length === 0) return null;

  return (
    <section className="section section--ruled" id="services" data-reveal-scope>
      <div className="container">
        <SectionHead
          eyebrow="Services"
          title={settings.services_heading}
          intro={settings.services_intro}
        />

        <ul className="services">
          {services.map((service) => (
            <li className="service" key={service.id} data-reveal>
              <Icon name={service.icon} className="service__icon" />
              <h3 className="service__name">{service.name}</h3>
              {service.description && <p className="service__text">{service.description}</p>}
              {service.stack?.length > 0 && (
                <ul className="tags service__stack">
                  {service.stack.map((item) => (
                    <li className="tag" key={item}>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
