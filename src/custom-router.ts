

import {
  Router,
  RouterState,
  UrlTree
} from '@angular/router';

import { Observable } from 'rxjs/Observable';

export class CustomRouter extends Router {

  protected activateRoutes(state: Observable<{appliedUrl: string, state: RouterState, shouldActivate: boolean}>, storedState: RouterState,
    storedUrl: UrlTree, id: number, url: UrlTree, rawUrl: UrlTree, skipLocationChange: boolean, replaceUrl: boolean, resolvePromise: any, rejectPromise: any) {

      // applied the new router state
    // this operation has side effects
    let navigationIsSuccessful: boolean;

    state
      .forEach(({appliedUrl, state, shouldActivate}: any) => {
        if (!shouldActivate || id !== this.navigationId) {
          navigationIsSuccessful = false;
          return;
        }

        this.currentUrlTree = appliedUrl;
        this.rawUrlTree = this.urlHandlingStrategy.merge(this.currentUrlTree, rawUrl);

        (this as{routerState: RouterState}).routerState = state;

        if (!skipLocationChange) {
          const path = this.urlSerializer.serialize(this.rawUrlTree);
          if (this.location.isCurrentPathEqualTo(path) || replaceUrl) {
            this.location.replaceState(path, '', {navigationId: id});
          } else {
            this.location.go(path, '', {navigationId: id});
          }
        }

        new ActivateRoutes(
            this.routeReuseStrategy, state, storedState, (evt: Event) => this.triggerEvent(evt))
            .activate(this.rootContexts);

        navigationIsSuccessful = true;
      })
      .then(
          () => {
            if (navigationIsSuccessful) {
              this.navigated = true;
              this.lastSuccessfulId = id;
              (this.events as Subject<Event>)
                  .next(new NavigationEnd(
                      id, this.serializeUrl(url), this.serializeUrl(this.currentUrlTree)));
              resolvePromise(true);
            } else {
              this.resetUrlToCurrentUrlTree();
              (this.events as Subject<Event>)
                  .next(new NavigationCancel(id, this.serializeUrl(url), ''));
              resolvePromise(false);
            }
          },
          (e: any) => {
            if (isNavigationCancelingError(e)) {
              this.navigated = true;
              this.resetStateAndUrl(storedState, storedUrl, rawUrl);
              (this.events as Subject<Event>)
                  .next(new NavigationCancel(id, this.serializeUrl(url), e.message));

              resolvePromise(false);
            } else {
              this.resetStateAndUrl(storedState, storedUrl, rawUrl);
              (this.events as Subject<Event>)
                  .next(new NavigationError(id, this.serializeUrl(url), e));
              try {
                resolvePromise(this.errorHandler(e));
              } catch (ee) {
                rejectPromise(ee);
              }
            }
          });
  }
}