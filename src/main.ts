import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/dapp/config/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes)
    // Aquí puedes agregar otros providers globales si los necesitas
  ]
}).catch(err => console.error(err));