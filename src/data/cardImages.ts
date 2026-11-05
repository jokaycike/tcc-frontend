import { CartaColecionavel } from './cartasColecionaveis'

type ImageModule = {
  default: string
}

const imagensComuns = import.meta.glob<ImageModule>('../assets/cartas/comum/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
})
const imagensRaras = import.meta.glob<ImageModule>('../assets/cartas/raro/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
})
const imagensEpicas = import.meta.glob<ImageModule>('../assets/cartas/epico/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
})
const imagensLendarias = import.meta.glob<ImageModule>('../assets/cartas/lendario/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
})

const imagensPorRaridade: Record<CartaColecionavel['raridade'], string[]> = {
  comum: normalizarImagens(imagensComuns),
  raro: normalizarImagens(imagensRaras),
  epico: normalizarImagens(imagensEpicas),
  lendario: normalizarImagens(imagensLendarias),
}

export function imagemCartaColecionavel(carta: CartaColecionavel) {
  const imagens = imagensPorRaridade[carta.raridade]
  const todasImagens = Object.values(imagensPorRaridade).flat()
  const nomeNormalizado = normalizarNome(carta.nome)
  const imagemExata = imagens.find((imagem) => normalizarNome(nomeArquivo(imagem)) === nomeNormalizado)
  const imagemContemNome = imagens.find((imagem) => {
    const arquivoNormalizado = normalizarNome(nomeArquivo(imagem))
    return arquivoNormalizado.includes(nomeNormalizado) || nomeNormalizado.includes(arquivoNormalizado)
  })
  const imagemExataFallback = todasImagens.find((imagem) => normalizarNome(nomeArquivo(imagem)) === nomeNormalizado)
  const imagemContemNomeFallback = todasImagens.find((imagem) => {
    const arquivoNormalizado = normalizarNome(nomeArquivo(imagem))
    return arquivoNormalizado.includes(nomeNormalizado) || nomeNormalizado.includes(arquivoNormalizado)
  })

  return imagemExata || imagemContemNome || imagemExataFallback || imagemContemNomeFallback || carta.imagemFallback
}

function normalizarImagens(modulos: Record<string, ImageModule>) {
  return Object.entries(modulos)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, modulo]) => modulo.default)
}

function nomeArquivo(src: string) {
  const semQuery = src.split('?')[0]
  const partes = semQuery.split('/')
  const arquivo = partes[partes.length - 1] || ''
  return arquivo.replace(/\.[^.]+$/, '')
}

function normalizarNome(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
}
