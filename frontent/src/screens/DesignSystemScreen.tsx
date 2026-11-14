import { CloudRain, Droplets, Leaf, MapPin, Thermometer } from 'lucide-react';
import { Badge, BrandMark, Button, Card, Field, MetricCard, Notice, SectionHeading } from '../components/ui';
import { designTokens } from '../design-system/tokens';

const colorTokens = [
  ['Forest 950', designTokens.color.forest950],
  ['Forest 700', designTokens.color.forest700],
  ['Leaf 500', designTokens.color.leaf500],
  ['Leaf 300', designTokens.color.leaf300],
  ['Canvas', designTokens.color.canvas],
  ['Sky 700', designTokens.color.sky700],
  ['Amber 700', designTokens.color.amber700],
  ['Danger 700', designTokens.color.danger700],
];

export function DesignSystemScreen() {
  return (
    <main className="ds-page">
      <div className="ds-shell">
        <header className="ds-header">
          <BrandMark />
          <Badge tone="success">Living reference · v1</Badge>
        </header>

        <section className="ds-hero">
          <p className="ds-eyebrow">AgroShift AI · visual foundation</p>
          <h1>Una interfaz que hace visible la decisión agrícola.</h1>
          <p className="ds-hero__copy">
            Sistema visual mobile-first inspirado en el Altiplano: datos claros, confianza en las fuentes y acciones que se sienten simples.
          </p>
          <div className="ds-hero__actions">
            <Button size="lg">Analizar mi parcela →</Button>
            <Button variant="secondary" size="lg">Ver metodología</Button>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeading eyebrow="01 · Tokens" title="Color, forma y ritmo" description="Los valores base se consumen desde tokens para evitar decisiones visuales aisladas." />
          <div className="ds-token-grid">
            {colorTokens.map(([name, value]) => (
              <div className="ds-token" key={name}>
                <span style={{ backgroundColor: value }} aria-hidden="true" />
                <div><strong>{name}</strong><small>{value}</small></div>
              </div>
            ))}
          </div>
          <div className="ds-token-notes">
            <Badge tone="success">Radio: 10 · 14 · 20 · 28</Badge>
            <Badge tone="info">Sombra: suave y contextual</Badge>
            <Badge tone="neutral">Espaciado: múltiplos de 4</Badge>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeading eyebrow="02 · Components" title="Primitivas para construir pantallas" description="Cada componente mantiene estados, foco visible, lectura mobile y jerarquía de fuente." />
          <div className="ds-component-grid">
            <Card>
              <h3>Acciones</h3>
              <div className="ds-stack ds-stack--inline"><Button size="sm">Primaria</Button><Button variant="secondary" size="sm">Secundaria</Button><Button variant="ghost" size="sm">Terciaria</Button></div>
              <div className="ds-stack ds-stack--inline"><Badge tone="success">Confiable</Badge><Badge tone="warning">Revisar</Badge><Badge tone="danger">Riesgo alto</Badge><Badge tone="info">NASA POWER</Badge></div>
            </Card>
            <Card>
              <h3>Entrada</h3>
              <Field label="Nombre de la parcela" defaultValue="Parcela piloto · Viacha" hint="Usá un nombre reconocible para volver a encontrarla." />
            </Card>
            <Card>
              <h3>Estado</h3>
              <Notice tone="success" title="Datos listos">La serie climática está disponible para comparar escenarios.</Notice>
              <div className="ds-stack"><Notice tone="warning" title="Requiere validación">La humedad es una referencia regional, no una medición de campo.</Notice></div>
            </Card>
          </div>
        </section>

        <section className="ds-section">
          <SectionHeading eyebrow="03 · Data display" title="Métricas con fuente visible" description="La interfaz debe mostrar el valor, la unidad y el origen sin obligar a interpretar el dato." />
          <div className="ds-metric-grid">
            <MetricCard label="Temperatura media" value="12.6 °C" source="NASA POWER · histórico" icon={<Thermometer size={18} />} tone="warning" />
            <MetricCard label="Precipitación anual" value="463 mm" source="NASA POWER · 2020–2024" icon={<CloudRain size={18} />} tone="info" />
            <MetricCard label="Humedad del suelo" value="28 %" source="SMAP · referencia regional" icon={<Droplets size={18} />} tone="info" />
            <MetricCard label="Área registrada" value="2.4 ha" source="Polígono de parcela" icon={<MapPin size={18} />} />
          </div>
        </section>

        <section className="ds-section ds-section--principles">
          <SectionHeading eyebrow="04 · Principles" title="Criterios para la mejora del frontend" />
          <div className="ds-principles">
            <Card><Leaf size={20} /><h3>Primero la parcela</h3><p>La parcela activa siempre debe ser visible y contextualizar cada dato.</p></Card>
            <Card><Droplets size={20} /><h3>Fuente antes que promesa</h3><p>Cada indicador informa origen, alcance y nivel de certeza.</p></Card>
            <Card><MapPin size={20} /><h3>Acción en un pulgar</h3><p>Las acciones principales deben estar al alcance y tener un verbo claro.</p></Card>
          </div>
        </section>

        <footer className="ds-footer">Abrí esta referencia con <code>#design-system</code>. Los cambios de producto deben reutilizar estas primitivas antes de crear estilos nuevos.</footer>
      </div>
    </main>
  );
}
