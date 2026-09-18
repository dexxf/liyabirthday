import Phaser from 'phaser'
import './style.css'
import { gameConfig } from './game/config'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = '<div id="game"></div>'

new Phaser.Game({
  ...gameConfig,
  parent: 'game',
})