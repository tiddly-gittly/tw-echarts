export function getEChartsPaletteColor(
  name: string,
  fallback = '#ffffff',
): string {
  if (typeof $tw !== 'undefined' && $tw.wiki && $tw.wiki.getTiddlerText) {
    const tiddlerText =
      $tw.wiki.getTiddlerText(
        `$:/config/DefaultColourMappings/echarts-${name}`,
      ) || $tw.wiki.getTiddlerText(`$:/palette/${name}`);
    if (tiddlerText) {
      return tiddlerText.trim();
    }
  }
  return fallback;
}
