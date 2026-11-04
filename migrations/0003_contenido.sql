-- Migración 0003: contenido educativo inicial (RF-19: al menos un artículo por tema).

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'que-es-invertir',
'¿Qué es invertir? Acciones, ETF, criptomonedas y ahorro',
'CONCEPTOS_BASICOS',
'Invertir es destinar dinero hoy con la expectativa de obtener más en el futuro; conoce los cuatro tipos de activos que ofrece el simulador.',
'## La idea central

**Invertir** es destinar dinero hoy a un activo con la expectativa de que valga más en el futuro o de que genere ingresos. A diferencia de guardar el dinero debajo del colchón, quien invierte acepta cierto **riesgo** a cambio de la posibilidad de obtener un **rendimiento**.

Una regla básica de las finanzas: a mayor rendimiento esperado, mayor riesgo. No existe una inversión que prometa mucho y no arriesgue nada.

## Los cuatro tipos de activos del simulador

- **Acciones:** una acción es una pequeña parte de la propiedad de una empresa. Si la empresa crece y sus ganancias mejoran, el precio de la acción suele subir; si le va mal, puede bajar.
- **ETF (fondos cotizados):** es una "cesta" que agrupa muchos activos, por ejemplo las 500 empresas más grandes de un país. Al comprar una unidad del ETF, quedas expuesto a todos ellos a la vez.
- **Criptomonedas:** activos digitales como Bitcoin o Ethereum que se negocian todo el día. Sus precios cambian muy rápido y con mucha fuerza.
- **Cuenta de ahorro:** guarda tu dinero y paga un interés definido. Su valor casi no fluctúa, pero el rendimiento suele ser menor.

## Una comparación sencilla

| Activo | Riesgo habitual | Rendimiento potencial |
|---|---|---|
| Cuenta de ahorro | Bajo | Bajo |
| ETF | Medio | Medio |
| Acciones | Medio-alto | Medio-alto |
| Criptomonedas | Muy alto | Muy alto (y también pérdidas) |

## ¿Por qué un simulador?

Aprender a invertir con dinero real puede ser costoso si se cometen errores. En esta plataforma empiezas con **dinero ficticio**, de modo que puedes probar estrategias, equivocarte y observar las consecuencias sin perder nada de tu bolsillo. Lo que aprendas aquí te ayudará a tomar decisiones más informadas en el futuro.

## Conceptos que verás con frecuencia

- **Precio:** lo que cuesta una unidad del activo hoy.
- **Portafolio:** el conjunto de activos que posees.
- **Posición:** la cantidad que tienes de un activo en particular.
- **Valor de mercado:** cantidad que posees multiplicada por el precio actual.

Por ejemplo, si tienes 10 acciones y cada una vale USD 150,00, el valor de mercado de esa posición es USD 1.500,00.

## Para recordar

- Invertir implica aceptar riesgo a cambio de un posible rendimiento.
- Acciones, ETF, criptomonedas y ahorro tienen perfiles de riesgo muy distintos.
- Un ETF agrupa muchos activos en uno solo.
- El simulador usa dinero ficticio para que practiques sin consecuencias reales.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'primera-compra',
'Cómo usar este simulador: tu primera compra paso a paso',
'CONCEPTOS_BASICOS',
'Guía práctica para crear un portafolio, buscar un activo, comprar, vender y entender qué ocurre si tu patrimonio cae por debajo de USD 100.',
'## Tu punto de partida

Al registrarte recibes **USD 10.000,00 ficticios** como saldo inicial. Con ese dinero puedes comprar activos y observar cómo evoluciona tu patrimonio.

## Paso 1: crea un portafolio

Un **portafolio** es una carpeta donde agrupas tus inversiones según un objetivo (por ejemplo, "Largo plazo" o "Prueba cripto"). Puedes tener **hasta 10 portafolios** y cada uno debe tener un **nombre único** dentro de tu cuenta.

## Paso 2: busca en el catálogo

Usa el buscador para explorar acciones, ETF y criptomonedas. Revisa el precio actual, el gráfico y la información disponible antes de decidir.

## Paso 3: elige la cantidad

- **Acciones y ETF:** se compran en **unidades enteras** (1, 2, 10...).
- **Criptomonedas:** admiten **fracciones de hasta 8 decimales**, por ejemplo 0,00150000 BTC.

## Paso 4: revisa y confirma

Las compras se ejecutan al **último precio registrado**, **sin comisiones**. Antes de enviar la orden verás un **resumen** con el activo, la cantidad y el costo total. Si estás de acuerdo, **confirmas**.

La orden terminará en uno de tres estados:

- **Ejecutada:** la operación se completó.
- **Rechazada:** no se pudo realizar, por ejemplo por saldo insuficiente.
- **Cancelada:** decidiste no continuar.

## Costo promedio

Si compras el mismo activo varias veces a precios distintos, el simulador calcula el **costo promedio ponderado**. Ejemplo: compras 10 unidades a USD 100,00 y luego 10 a USD 120,00. Pagaste USD 2.200,00 por 20 unidades, así que tu costo promedio es USD 110,00 por unidad.

## Vender

Puedes vender parte o toda tu posición, pero **nunca más de lo que posees**. El dinero de la venta vuelve a tu saldo disponible.

## Bancarrota simulada

Tu **patrimonio** es la suma de tu saldo disponible más el valor de mercado de tus posiciones. Si cae por debajo de **USD 100,00**, entras en **bancarrota simulada**. En ese caso puedes **reiniciar** tu cuenta con USD 10.000,00. El sistema lleva un **contador de bancarrotas** y conserva todo tu historial, de modo que puedas revisar qué salió mal y aprender de ello.

## Para recordar

- Empiezas con USD 10.000,00 ficticios y puedes crear hasta 10 portafolios con nombres únicos.
- Acciones y ETF se compran en unidades enteras; las criptomonedas admiten hasta 8 decimales.
- Las compras usan el último precio registrado y no tienen comisiones.
- Una orden puede quedar Ejecutada, Rechazada o Cancelada.
- No puedes vender más de lo que tienes.
- Con un patrimonio menor a USD 100,00 puedes reiniciar; tu historial se conserva.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'riesgo-y-volatilidad',
'Riesgo y volatilidad: por qué los precios suben y bajan',
'RIESGO',
'La volatilidad mide cuánto fluctúa un precio; aprende a calcularla con un ejemplo sencillo y a leer la media móvil de 20 días.',
'## ¿Qué es el riesgo?

En inversión, **riesgo** es la posibilidad de que el resultado sea distinto de lo esperado, incluida la posibilidad de perder parte del dinero. No significa solo "perder": también describe qué tan incierto es el camino.

## Volatilidad: medir las sacudidas

La **volatilidad** indica cuánto se mueve el precio de un activo. Se calcula como la **desviación estándar de los rendimientos diarios**. Dicho sin tecnicismos: mide qué tan lejos suelen estar los cambios diarios de su promedio.

- Volatilidad **baja**: el precio cambia poco día a día.
- Volatilidad **alta**: hay saltos grandes, hacia arriba y hacia abajo.

## Un ejemplo numérico

Imagina un activo con estos rendimientos diarios en cinco días: **+1 %, −1 %, +2 %, −2 % y 0 %**.

1. El promedio es 0 % (la suma es 0).
2. Elevamos cada desvío al cuadrado: 1, 1, 4, 4 y 0. Su suma es 10.
3. Dividimos entre 5 datos: 10 / 5 = 2.
4. La raíz cuadrada de 2 es aproximadamente **1,41 %**.

La volatilidad diaria de este activo es cercana a 1,41 %. Otro activo con cambios de +5 % y −5 % tendría una volatilidad mucho mayor y sería más riesgoso.

## Tendencia con la media móvil de 20 días

Los precios diarios son "ruidosos". La **media móvil de 20 días** promedia los últimos 20 precios de cierre y se actualiza cada día, lo que suaviza el ruido y deja ver la dirección general:

- Si el precio se mantiene **por encima** de su media móvil, la tendencia reciente es alcista.
- Si está **por debajo**, la tendencia reciente es bajista.

Es una herramienta descriptiva: indica lo que ha pasado, no garantiza lo que pasará.

## ¿Por qué suben y bajan los precios?

Los precios cambian por noticias de las empresas, decisiones económicas, expectativas de los inversionistas y, simplemente, por la oferta y la demanda. Cuando más personas quieren comprar que vender, el precio tiende a subir, y al revés.

## Cómo usar esta información

Antes de comprar, observa el gráfico histórico y pregúntate si tolerarías ver caer ese activo un 20 % en poco tiempo. Tu **tolerancia al riesgo** es personal y depende de tus metas y de tu horizonte de tiempo.

## Para recordar

- Riesgo es la incertidumbre sobre el resultado, incluida la pérdida.
- La volatilidad es la desviación estándar de los rendimientos diarios.
- Mayor volatilidad significa mayores subidas y bajadas posibles.
- La media móvil de 20 días ayuda a ver la tendencia reciente, pero no predice el futuro.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'medir-rendimiento',
'Cómo se mide el rendimiento de una inversión',
'RENDIMIENTO',
'Aprende la fórmula del rendimiento porcentual y la diferencia entre ganancia realizada y no realizada con un ejemplo paso a paso.',
'## ¿Qué es el rendimiento?

El **rendimiento** indica cuánto ha ganado o perdido una inversión en relación con el dinero que pusiste. Expresarlo en porcentaje permite comparar inversiones de tamaños distintos.

## La fórmula

**Rendimiento (%) = (valor de mercado − capital invertido) / capital invertido × 100**

- **Capital invertido:** lo que pagaste por la posición.
- **Valor de mercado:** lo que vale hoy, según el precio actual.

Si el resultado es positivo hay ganancia; si es negativo, pérdida.

## Ganancia realizada y no realizada

- **Ganancia no realizada:** existe "en papel" mientras sigues teniendo el activo. Puede aumentar, disminuir o desaparecer.
- **Ganancia realizada:** se concreta cuando vendes. Es dinero que ya entró a tu saldo.

## Ejemplo paso a paso

Compras **10 unidades a USD 150,00**. El capital invertido es 10 × 150 = **USD 1.500,00**.

**Situación 1: sigues con el activo.** El precio sube a USD 160,00. Tu valor de mercado es 10 × 160 = USD 1.600,00.

- Ganancia no realizada: 1.600 − 1.500 = **USD 100,00**.
- Rendimiento: 100 / 1.500 × 100 = **6,67 %**.

**Situación 2: vendes todo a USD 160,00.** Recibes USD 1.600,00.

- Ganancia realizada: 1.600 − 1.500 = **USD 100,00**.

La cifra es la misma, pero ahora ya es real: está en tu saldo y no depende de movimientos futuros del precio.

## Y si el precio baja

Si el precio cae a USD 140,00, el valor de mercado es USD 1.400,00. La pérdida es USD 100,00 y el rendimiento es −100 / 1.500 × 100 = **−6,67 %**. Mientras no vendas, es una pérdida no realizada: podría recuperarse o profundizarse.

## Cuidado con las comparaciones

Un rendimiento alto en poco tiempo no significa que sea sostenible. Compara siempre el rendimiento junto con el **riesgo** asumido y el **plazo** transcurrido.

## Para recordar

- Rendimiento (%) = (valor de mercado − capital invertido) / capital invertido × 100.
- La ganancia no realizada solo existe mientras conservas el activo.
- La ganancia realizada se concreta al vender.
- Comprar 10 unidades a USD 150,00 y vender a USD 160,00 deja una ganancia realizada de USD 100,00.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'diversificacion',
'Diversificación: no pongas todos los huevos en la misma canasta',
'DIVERSIFICACION',
'Repartir tu dinero entre distintos activos reduce el impacto de que uno solo falle; conoce la correlación y el papel de los ETF.',
'## La idea

**Diversificar** significa repartir tu dinero entre activos distintos para que un mal resultado en uno no destruya todo el portafolio. Es la versión financiera del refrán "no pongas todos los huevos en la misma canasta".

## Un ejemplo de composición

Supón un portafolio de USD 10.000,00 repartido así:

| Tipo de activo | Monto | Porcentaje |
|---|---|---|
| Acciones | USD 4.000,00 | 40 % |
| ETF | USD 3.000,00 | 30 % |
| Cuenta de ahorro | USD 2.000,00 | 20 % |
| Criptomonedas | USD 1.000,00 | 10 % |

Si las criptomonedas cayeran 50 %, perderías USD 500,00, es decir, un 5 % del total. En cambio, si hubieras puesto los USD 10.000,00 solo en criptomonedas, la misma caída te costaría USD 5.000,00.

## Correlación: ¿se mueven juntos?

La **correlación** describe si dos activos tienden a moverse en la misma dirección.

- **Correlación alta:** suben y bajan al mismo tiempo (por ejemplo, dos empresas del mismo sector).
- **Correlación baja o negativa:** cuando uno baja, el otro puede mantenerse o subir.

Diversificar sirve más cuando combinas activos poco correlacionados. Comprar diez acciones del mismo sector parece variado, pero puede comportarse casi como una sola apuesta.

## ETF: diversificación incluida

Un **ETF** contiene muchos activos dentro de una sola unidad. Con una compra obtienes exposición a decenas o cientos de empresas, algo que sería difícil de lograr comprando acción por acción con poco dinero.

## Límites de la diversificación

- No elimina el riesgo; reduce el riesgo propio de cada activo, pero no el del mercado en general.
- En una crisis fuerte, muchos activos pueden caer a la vez.
- Diversificar en exceso puede diluir tus ganancias y complicar el seguimiento.

## Cómo practicarlo en el simulador

Crea varios portafolios con objetivos distintos, compara cómo se comportan ante los escenarios de mercado y revisa la composición porcentual por tipo de activo.

## Para recordar

- Diversificar es repartir el dinero entre activos diferentes.
- Importa la correlación: conviene combinar activos que no se muevan igual.
- Los ETF ofrecen diversificación integrada.
- La diversificación reduce el riesgo, pero no lo elimina.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'interes-compuesto',
'Interés compuesto: el poder del tiempo',
'INTERES_COMPUESTO',
'El interés compuesto genera intereses sobre los intereses; aprende la fórmula y compara capitalización mensual, trimestral y anual.',
'## Intereses sobre intereses

Con el **interés simple**, ganas intereses solo sobre el dinero inicial. Con el **interés compuesto**, los intereses ganados se suman al capital y, a partir de ese momento, también generan intereses. Con el tiempo, el efecto es poderoso.

## La fórmula

**VF = P · (1 + r/n)^(n·t)**

- **VF:** valor final.
- **P:** capital inicial.
- **r:** tasa nominal anual (en decimal; 12 % = 0,12).
- **n:** veces que se capitaliza por año (12 mensual, 4 trimestral, 1 anual).
- **t:** tiempo en años.

## Ejemplo resuelto

Depositas **P = USD 1.000,00** a una tasa de **r = 12 % nominal anual**, con capitalización **mensual**, durante **t = 1 año**.

- Tasa por periodo: 0,12 / 12 = 0,01 (1 % mensual).
- Periodos: 12 × 1 = 12.
- VF = 1.000 × (1,01)^12 = **USD 1.126,83**.
- Interés ganado: **USD 126,83**.

## ¿Importa la frecuencia?

Con los mismos datos (USD 1.000,00, 12 %, 1 año):

| Capitalización | Cálculo | Valor final |
|---|---|---|
| Mensual | 1.000 × (1,01)^12 | USD 1.126,83 |
| Trimestral | 1.000 × (1,03)^4 | USD 1.125,51 |
| Anual | 1.000 × (1,12)^1 | USD 1.120,00 |

Cuanto más frecuente es la capitalización, mayor es el resultado, aunque la diferencia en un solo año es pequeña. En plazos largos, la diferencia crece.

## En el simulador

La calculadora de ahorro permite probar:

- **Tasas** entre 0 % y 30 % anual.
- **Plazos** de 1 a 120 meses.
- Capitalización **mensual**, **trimestral** o **anual**.

Cambia un dato a la vez y observa cuánto influye cada uno. Verás que el **tiempo** suele pesar más que cualquier otro factor: empezar temprano marca la diferencia.

## El otro lado del interés compuesto

También funciona en contra: una deuda con intereses altos crece de la misma manera. Entender este mecanismo te ayuda tanto a ahorrar como a evitar endeudamientos costosos.

## Para recordar

- VF = P · (1 + r/n)^(n·t).
- USD 1.000,00 al 12 % nominal anual, capitalización mensual durante 1 año dan USD 1.126,83.
- A mayor frecuencia de capitalización, mayor valor final.
- El tiempo es el factor más poderoso del interés compuesto.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'criptomonedas',
'Criptomonedas: qué son y por qué son tan volátiles',
'CRIPTOMONEDAS',
'Conoce qué son Bitcoin y Ethereum, cómo funciona una blockchain y por qué sus precios cambian tanto y conllevan riesgos particulares.',
'## ¿Qué es una criptomoneda?

Una **criptomoneda** es un activo digital que se registra y transfiere mediante criptografía, sin depender de un banco central. Las más conocidas son **Bitcoin (BTC)**, creada en 2009 y pensada como dinero digital, y **Ethereum (ETH)**, que además permite ejecutar programas llamados contratos inteligentes.

## Blockchain en pocas palabras

Una **blockchain** es un libro de registro compartido y distribuido entre miles de computadores. Las transacciones se agrupan en "bloques" encadenados entre sí. Como la información está replicada y cada bloque depende del anterior, modificar el pasado es muy difícil.

## Características de este mercado

- **Funciona 24/7:** no cierra en fines de semana ni festivos.
- **Unidades fraccionarias:** puedes poseer una fracción muy pequeña de una moneda. En el simulador se admiten hasta **8 decimales**.
- **Alta volatilidad:** es común ver cambios de 5 % o 10 % en un solo día, algo poco habitual en una cuenta de ahorro.

## ¿Por qué son tan volátiles?

- Mercado relativamente joven y con menos regulación que el de acciones.
- Precio influido por la especulación y las noticias.
- Su valor no está respaldado por ganancias de una empresa ni por un gobierno.
- Pocos grandes tenedores pueden mover el precio con sus operaciones.

## Riesgos que debes conocer

- **Fraudes y estafas:** promesas de ganancias garantizadas, esquemas piramidales y sitios falsos.
- **Pérdida de llaves:** si pierdes la clave privada de una billetera, puedes perder el acceso a tus fondos sin posibilidad de recuperarlos.
- **Pérdidas fuertes:** un activo puede caer más de la mitad de su valor en poco tiempo.

## Nota sobre Colombia

En Colombia las criptomonedas **no son moneda de curso legal**: no están respaldadas por el Banco de la República y no es obligatorio aceptarlas como medio de pago. Si algún día decides operar con dinero real, infórmate sobre la regulación vigente y las obligaciones tributarias.

## En el simulador

Aquí puedes experimentar con criptomonedas usando dinero ficticio, observar su volatilidad y ver cómo reaccionan ante los escenarios de mercado, sin arriesgar tu patrimonio real.

## Para recordar

- Bitcoin y Ethereum son las criptomonedas más conocidas; funcionan sobre una blockchain.
- El mercado opera 24/7 y admite fracciones de hasta 8 decimales en el simulador.
- Su volatilidad es muy alta y conlleva riesgo de pérdidas fuertes.
- Hay riesgos de estafas y de pérdida de llaves.
- En Colombia no son moneda de curso legal.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);

INSERT INTO contenido_educativo (slug, titulo, tema, resumen, cuerpo, estado, publicado_en) VALUES (
'escenarios-de-mercado',
'Escenarios de mercado: crisis, mercado alcista y alza de tasas',
'RIESGO',
'Simula cómo reaccionaría tu portafolio ante una crisis, un mercado alcista o un alza de tasas, sin modificar tus inversiones reales.',
'## Para qué sirven los escenarios

Un **escenario** es una situación hipotética del mercado. Sirve para hacerte la pregunta "¿qué le pasaría a mi portafolio si ocurriera esto?" y así evaluar tu exposición al riesgo antes de que suceda.

## Escenarios predefinidos

**Crisis financiera**

- Acciones: **−30 %**
- ETF: **−20 %**
- Criptomonedas: **−50 %**
- Tasa de ahorro: **−2 puntos porcentuales** (sin bajar de 0 %)

**Mercado alcista**

- Acciones: **+20 %**
- ETF: **+15 %**
- Criptomonedas: **+40 %**

**Alza de tasas**

- Acciones: **−10 %**
- ETF: **−8 %**
- Criptomonedas: **−15 %**
- Tasa de ahorro: **+3 puntos porcentuales**

Un **punto porcentual (p. p.)** es la diferencia directa entre dos tasas: si el ahorro paga 4 % y sube 3 p. p., pasa a pagar 7 %.

## Ejemplo con la crisis

Un portafolio de **USD 1.000,00 invertido solo en acciones**, bajo la Crisis financiera, pierde 30 %:

1.000 × (1 − 0,30) = **USD 700,00**.

Si estuviera repartido entre acciones, ETF y ahorro, la caída sería menor. Aquí se ve el valor de la diversificación.

## Escenarios personalizados

Puedes definir tu propio escenario con una **volatilidad**. El simulador calcula un rango alrededor del valor proyectado:

**Rango = valor proyectado × (1 ± volatilidad)**

Ejemplo: con USD 1.000,00 y volatilidad de 10 %:

- Mínimo: 1.000 × (1 − 0,10) = **USD 900,00**.
- Máximo: 1.000 × (1 + 0,10) = **USD 1.100,00**.

Es decir, el resultado probable se ubica entre USD 900,00 y USD 1.100,00.

## Algo importante

Las simulaciones **nunca modifican tu portafolio real**. Son solo cálculos para analizar posibilidades; tus posiciones, tu saldo y tu historial permanecen intactos.

## Lectura crítica

Los escenarios son simplificaciones. En la realidad, los activos no se mueven por porcentajes exactos y las crisis pueden ser más o menos fuertes. Úsalos como ejercicio de prevención, no como pronóstico.

## Para recordar

- Un escenario muestra cómo reaccionaría tu portafolio ante un evento hipotético.
- Hay tres escenarios predefinidos: Crisis financiera, Mercado alcista y Alza de tasas.
- USD 1.000,00 solo en acciones bajo la Crisis quedan en USD 700,00.
- En escenarios personalizados, el rango es valor proyectado × (1 ± volatilidad).
- Las simulaciones no alteran tu portafolio real.

Este contenido es educativo y no constituye asesoría financiera.
',
'PUBLICADO',
'2026-11-04T00:00:00.000Z'
);
