// Copyright 2000-2019 JetBrains s.r.o. Use of this source code is governed by the Apache 2.0 license that can be found in the LICENSE file.
import {Operator} from './Operator';
import {Subscriber} from './Subscriber';
import {Subscription} from './Subscription';
import {OperatorFunction, PartialObserver, Subscribable, TeardownLogic} from './types';
import {toSubscriber} from './util/toSubscriber';
import {iif} from './observable/iif';
import {throwError} from './observable/throwError';
import {pipeFromArray} from './util/pipe';
import {config} from './config';

/**
 * A representation of any set of values over any amount of time. This is the most basic building block
 * of RxJS.
 *
 * @class Observable<T>
 */
export declare class Observable<T> {

  /** Internal implementation detail, do not use directly. */
  public _isScalar: boolean;

  /**
   * @constructor
   * @param {Function} subscribe the function that is called when the Observable is
   * initially subscribed to. This function is given a Subscriber, to which new values
   * can be `next`ed, or an `error` method can be called to raise an error, or
   * `complete` can be called to notify of a successful completion.
   */
  constructor(subscribe?: (this: Observable<T>, subscriber: Subscriber<T>) => TeardownLogic);

  /**
   * Creates a new Observable, with this Observable as the source, and the passed
   * operator defined as the new observable's operator.
   * @method lift
   * @param {Operator} operator the operator defining the operation to take on the observable
   * @return {Observable} a new observable with the Operator applied
   */
  lift<R>(operator: Operator<T, R>): Observable<R>;

  subscribe(observer?: PartialObserver<T>): Subscription;
  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription;
  /**
   * Invokes an execution of an Observable and registers Observer handlers for notifications it will emit.
   *
   * <span class="informal">Use it when you have all these Observables, but still nothing is happening.</span>
   *
   * `subscribe` is not a regular operator, but a method that calls Observable's internal `subscribe` function. It
   * might be for example a function that you passed to a {@link create} static factory, but most of the time it is
   * a library implementation, which defines what and when will be emitted by an Observable. This means that calling
   * `subscribe` is actually the moment when Observable starts its work, not when it is created, as it is often
   * thought.
   *
   * Apart from starting the execution of an Observable, this method allows you to listen for values
   * that an Observable emits, as well as for when it completes or errors. You can achieve this in two
   * following ways.
   *
   * The first way is creating an object that implements {@link Observer} interface. It should have methods
   * defined by that interface, but note that it should be just a regular JavaScript object, which you can create
   * yourself in any way you want (ES6 class, classic function constructor, object literal etc.). In particular do
   * not attempt to use any RxJS implementation details to create Observers - you don't need them. Remember also
   * that your object does not have to implement all methods. If you find yourself creating a method that doesn't
   * do anything, you can simply omit it. Note however, that if `error` method is not provided, all errors will
   * be left uncaught.
   *
   * The second way is to give up on Observer object altogether and simply provide callback functions in place of its methods.
   * This means you can provide three functions as arguments to `subscribe`, where first function is equivalent
   * of a `next` method, second of an `error` method and third of a `complete` method. Just as in case of Observer,
   * if you do not need to listen for something, you can omit a function, preferably by passing `undefined` or `null`,
   * since `subscribe` recognizes these functions by where they were placed in function call. When it comes
   * to `error` function, just as before, if not provided, errors emitted by an Observable will be thrown.
   *
   * Whatever style of calling `subscribe` you use, in both cases it returns a Subscription object.
   * This object allows you to call `unsubscribe` on it, which in turn will stop work that an Observable does and will clean
   * up all resources that an Observable used. Note that cancelling a subscription will not call `complete` callback
   * provided to `subscribe` function, which is reserved for a regular completion signal that comes from an Observable.
   *
   * Remember that callbacks provided to `subscribe` are not guaranteed to be called asynchronously.
   * It is an Observable itself that decides when these functions will be called. For example {@link of}
   * by default emits all its values synchronously. Always check documentation for how given Observable
   * will behave when subscribed and if its default behavior can be modified with a {@link Scheduler}.
   *
   * ## Example
   * ### Subscribe with an Observer
   * ```javascript
   * const sumObserver = {
   *   sum: 0,
   *   next(value) {
   *     console.log('Adding: ' + value);
   *     this.sum = this.sum + value;
   *   },
   *   error() { // We actually could just remove this method,
   *   },        // since we do not really care about errors right now.
   *   complete() {
   *     console.log('Sum equals: ' + this.sum);
   *   }
   * };
   *
   * Rx.Observable.of(1, 2, 3) // Synchronously emits 1, 2, 3 and then completes.
   * .subscribe(sumObserver);
   *
   * // Logs:
   * // "Adding: 1"
   * // "Adding: 2"
   * // "Adding: 3"
   * // "Sum equals: 6"
   * ```
   *
   * ### Subscribe with functions
   * ```javascript
   * let sum = 0;
   *
   * Rx.Observable.of(1, 2, 3)
   * .subscribe(
   *   function(value) {
   *     console.log('Adding: ' + value);
   *     sum = sum + value;
   *   },
   *   undefined,
   *   function() {
   *     console.log('Sum equals: ' + sum);
   *   }
   * );
   *
   * // Logs:
   * // "Adding: 1"
   * // "Adding: 2"
   * // "Adding: 3"
   * // "Sum equals: 6"
   * ```
   *
   * ### Cancel a subscription
   * ```javascript
   * const subscription = Rx.Observable.interval(1000).subscribe(
   *   num => console.log(num),
   *   undefined,
   *   () => console.log('completed!') // Will not be called, even
   * );                                // when cancelling subscription
   *
   *
   * setTimeout(() => {
   *   subscription.unsubscribe();
   *   console.log('unsubscribed!');
   * }, 2500);
   *
   * // Logs:
   * // 0 after 1s
   * // 1 after 2s
   * // "unsubscribed!" after 2.5s
   * ```
   *
   * @param {Observer|Function} observerOrNext (optional) Either an observer with methods to be called,
   *  or the first of three possible handlers, which is the handler for each value emitted from the subscribed
   *  Observable.
   * @param {Function} error (optional) A handler for a terminal event resulting from an error. If no error handler is provided,
   *  the error will be thrown as unhandled.
   * @param {Function} complete (optional) A handler for a terminal event resulting from successful completion.
   * @return {ISubscription} a subscription reference to the registered handlers
   * @method subscribe
   */
  subscribe(observerOrNext?: PartialObserver<T> | ((value: T) => void),
            error?: (error: any) => void,
            complete?: () => void): Subscription;

  /** @deprecated This is an internal implementation detail, do not use. */
  _trySubscribe(sink: Subscriber<T>): TeardownLogic;

  /**
   * @method forEach
   * @param {Function} next a handler for each value emitted by the observable
   * @param {PromiseConstructor} [promiseCtor] a constructor function used to instantiate the Promise
   * @return {Promise} a promise that either resolves on observable completion or
   *  rejects with the handled error
   */
  forEach(next: (value: T) => void, promiseCtor?: PromiseConstructorLike): Promise<void>;

  /** @deprecated This is an internal implementation detail, do not use. */
  _subscribe(subscriber: Subscriber<any>): TeardownLogic;

  // `if` and `throw` are special snow flakes, the compiler sees them as reserved words. Deprecated in
  // favor of iif and throwError functions.
  /**
   * @nocollapse
   * @deprecated In favor of iif creation function: import { iif } from 'rxjs';
   */
  static if: typeof iif;
  /**
   * @nocollapse
   * @deprecated In favor of throwError creation function: import { throwError } from 'rxjs';
   */
  static throw: typeof throwError;

  /* tslint:disable:max-line-length */
  pipe(): Observable<T>;
  pipe<A>(op1: OperatorFunction<T, A>): Observable<A>;
  pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): Observable<B>;
  pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): Observable<C>;
  pipe<A, B, C, D>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>): Observable<D>;
  pipe<A, B, C, D, E>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>): Observable<E>;
  pipe<A, B, C, D, E, F>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>): Observable<F>;
  pipe<A, B, C, D, E, F, G>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>): Observable<G>;
  pipe<A, B, C, D, E, F, G, H>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>): Observable<H>;
  pipe<A, B, C, D, E, F, G, H, I>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>, op4: OperatorFunction<C, D>, op5: OperatorFunction<D, E>, op6: OperatorFunction<E, F>, op7: OperatorFunction<F, G>, op8: OperatorFunction<G, H>, op9: OperatorFunction<H, I>): Observable<I>;
  pipe<R>(...operations: OperatorFunction<any, any>[]): Observable<R>;
  /* tslint:enable:max-line-length */

  /**
   * Used to stitch together functional operators into a chain.
   * @method pipe
   * @return {Observable} the Observable result of all of the operators having
   * been called in the order they were passed in.
   *
   * ### Example
   * ```javascript
   * import { map, filter, scan } from 'rxjs/operators';
   *
   * Rx.Observable.interval(1000)
   *   .pipe(
   *     filter(x => x % 2 === 0),
   *     map(x => x + x),
   *     scan((acc, x) => acc + x)
   *   )
   *   .subscribe(x => console.log(x))
   * ```
   */
  pipe<R>(...operations: OperatorFunction<T, R>[]): Observable<R>;

  /* tslint:disable:max-line-length */
  toPromise<T>(this: Observable<T>): Promise<T>;
  toPromise<T>(this: Observable<T>, PromiseCtor: typeof Promise): Promise<T>;
  toPromise<T>(this: Observable<T>, PromiseCtor: PromiseConstructorLike): Promise<T>;
  /* tslint:enable:max-line-length */

  toPromise(promiseCtor?: PromiseConstructorLike): Promise<T>;
}
