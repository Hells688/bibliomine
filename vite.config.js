import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main:         'index.html',
        inscription:  'inscription.html',
        connexion:    'connexion.html',
        accueil:      'accueil.html',
        bibliotheque: 'bibliotheque.html',
        ajouter:      'ajouter.html',
      }
    }
  }
})
