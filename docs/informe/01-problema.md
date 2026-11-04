# 1. Problema

## 1.1 Descripción

Aprender a invertir suele costar dinero. Una persona sin formación financiera que quiere entender cómo funcionan las acciones, los fondos cotizados (ETF), las criptomonedas o el interés compuesto tiene pocas alternativas:

- **Teoría sin práctica.** Libros, cursos o videos explican los conceptos, pero no dejan experimentar sus consecuencias.
- **Práctica con dinero real.** Abrir una cuenta en un corredor de bolsa o en una plataforma de criptomonedas expone a pérdidas reales justo en la etapa en que más errores se cometen.

En la práctica, conceptos como **riesgo**, **volatilidad**, **diversificación**, **costo promedio** o **rendimiento** solo se interiorizan cuando se ven moverse con datos reales a lo largo del tiempo. Sin un entorno seguro, el aprendizaje queda incompleto o resulta costoso.

## 1.2 Caracterización

| Aspecto                        | Caracterización                                                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Afectados**                  | Estudiantes universitarios y personas interesadas en aprender a invertir, con conocimientos financieros básicos o nulos (SRS §2.3).                                                                                           |
| **Síntomas**                   | Miedo a perder dinero, decisiones impulsivas sin entender el riesgo, desconocimiento del efecto del tiempo (interés compuesto) y de la diversificación.                                                                       |
| **Causas**                     | No hay una herramienta gratuita, en español, que combine datos de mercado reales con dinero ficticio, retroalimentación sobre el rendimiento y contenido educativo.                                                           |
| **Consecuencias**              | Aprendizaje lento o costoso. Pérdidas reales evitables y exposición a fraudes, sobre todo con criptomonedas.                                                                                                                  |
| **Restricciones del contexto** | Proyecto académico de 16 semanas con un equipo de 3 estudiantes. Proveedor de datos gratuito con límites de consultas. No se maneja dinero real (RNF-03). Debe cumplirse la Ley 1581 de 2012 de protección de datos (RNF-07). |

## 1.3 Necesidades identificadas

A partir de los objetivos de la propuesta del proyecto, el SRS v1.0 identifica cuatro necesidades:

| ID   | Necesidad                                                                                  |
| ---- | ------------------------------------------------------------------------------------------ |
| N-01 | Contar con una herramienta educativa para comprender el funcionamiento de las inversiones. |
| N-02 | Crear y gestionar portafolios de inversión simulados, sin arriesgar dinero real.           |
| N-03 | Disponer de datos de mercado realistas y actualizados durante la simulación.               |
| N-04 | Recibir retroalimentación y análisis sobre el rendimiento de las inversiones.              |

## 1.4 Solución propuesta

Una **plataforma web educativa** en la que cada usuario recibe un saldo ficticio de **USD 10.000**. Con ese saldo puede:

- comprar y vender **acciones, ETF y criptomonedas** a precios reales y actualizados;
- simular **cuentas de ahorro con interés compuesto**;
- organizar sus inversiones en **varios portafolios**;
- analizar su rendimiento con **gráficos y estadísticas**;
- proyectar el efecto de **escenarios de mercado** (crisis, mercado alcista, alza de tasas);
- aprender en un **centro de contenido educativo**.

El equipo añadió dos ampliaciones a la propuesta original:

- las **criptomonedas** como cuarto tipo de instrumento;
- la **bancarrota simulada**: si el patrimonio cae por debajo de USD 100, el usuario puede reiniciar su cuenta. Un contador de bancarrotas sirve como retroalimentación.

**Fuera del alcance:** operaciones con dinero real, conexión con corredores, asesoría financiera personalizada y aplicaciones móviles nativas (SRS §1.4).
