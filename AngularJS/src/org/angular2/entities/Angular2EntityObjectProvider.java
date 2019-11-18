// Copyright 2000-2019 JetBrains s.r.o. Use of this source code is governed by the Apache 2.0 license that can be found in the LICENSE file.
package org.angular2.entities;

import com.intellij.lang.javascript.psi.ecma6.ES6Decorator;
import com.intellij.lang.javascript.psi.ecma6.TypeScriptClass;
import com.intellij.lang.javascript.psi.ecma6.TypeScriptField;
import com.intellij.lang.javascript.psi.ecmal4.JSAttributeList;
import com.intellij.lang.javascript.psi.stubs.JSImplicitElement;
import com.intellij.openapi.util.Condition;
import com.intellij.openapi.util.Ref;
import com.intellij.psi.PsiElement;
import com.intellij.psi.search.GlobalSearchScope;
import com.intellij.psi.stubs.StubIndex;
import com.intellij.psi.util.CachedValuesManager;
import com.intellij.util.ObjectUtils;
import com.intellij.util.containers.ContainerUtil;
import org.angular2.entities.ivy.*;
import org.angular2.entities.metadata.psi.Angular2MetadataEntity;
import org.angular2.entities.source.Angular2SourceComponent;
import org.angular2.entities.source.Angular2SourceDirective;
import org.angular2.entities.source.Angular2SourceModule;
import org.angular2.entities.source.Angular2SourcePipe;
import org.angular2.index.Angular2IndexingHandler;
import org.angular2.index.Angular2MetadataEntityClassNameIndex;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.Arrays;
import java.util.Collections;
import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;

import static com.intellij.psi.util.CachedValueProvider.Result.create;
import static com.intellij.util.ObjectUtils.doIfNotNull;
import static com.intellij.util.ObjectUtils.tryCast;
import static org.angular2.Angular2DecoratorUtil.*;
import static org.angular2.entities.ivy.Angular2IvyUtil.hasIvyMetadata;
import static org.angular2.entities.ivy.Angular2IvyUtil.isIvyMetadataSupportEnabled;
import static org.angular2.lang.Angular2LangUtil.isAngular2Context;

public class Angular2EntityObjectProvider<T extends Angular2Entity> {

  public static final Angular2EntityObjectProvider<Angular2Directive> DIRECTIVE_PROVIDER = new Angular2EntityObjectProvider<>(
    new SourceEntityGetter<>(
      Angular2IndexingHandler::isDirective,
      (dec, el) -> DIRECTIVE_DEC.equals(dec.getDecoratorName())
                   ? new Angular2SourceDirective(dec, el)
                   : new Angular2SourceComponent(dec, el),
      DIRECTIVE_DEC, COMPONENT_DEC),
    new MetadataEntityGetter<>(Angular2Directive.class),
    new IvyEntityGetter<>(
      entityDef -> entityDef instanceof Angular2IvyEntityDef.Component
                   ? new Angular2IvyComponent((Angular2IvyEntityDef.Component)entityDef)
                   : new Angular2IvyDirective(entityDef),
      Angular2IvyEntityDef.Directive.class
    )
  );

  public static final Angular2EntityObjectProvider<Angular2Module> MODULE_PROVIDER = new Angular2EntityObjectProvider<>(
    new SourceEntityGetter<>(Angular2IndexingHandler::isModule, Angular2SourceModule::new, MODULE_DEC),
    new MetadataEntityGetter<>(Angular2Module.class),
    new IvyEntityGetter<>(Angular2IvyModule::new, Angular2IvyEntityDef.Module.class)
  );

  public static final Angular2EntityObjectProvider<Angular2Pipe> PIPE_PROVIDER = new Angular2EntityObjectProvider<>(
    new SourceEntityGetter<>(
      Angular2IndexingHandler::isPipe, Angular2SourcePipe::new, PIPE_DEC),
    new MetadataEntityGetter<>(Angular2Pipe.class),
    new IvyEntityGetter<>(Angular2IvyPipe::new, Angular2IvyEntityDef.Pipe.class)
  );

  @NotNull public final SourceEntityGetter<T> source;
  @NotNull public final MetadataEntityGetter<T> metadata;
  @NotNull public final IvyEntityGetter<T, ?> ivy;

  private Angular2EntityObjectProvider(@NotNull SourceEntityGetter<T> source,
                                       @NotNull MetadataEntityGetter<T> metadata,
                                       @NotNull IvyEntityGetter<T, ?> ivy) {
    this.source = source;
    this.metadata = metadata;
    this.ivy = ivy;
  }

  @Nullable
  public T get(@Nullable PsiElement element) {
    if (element == null) {
      return null;
    }
    T result = source.get(element);
    if (result != null) {
      return result;
    }
    boolean isIvyMetadataSupportEnabled = isIvyMetadataSupportEnabled();
    if (isIvyMetadataSupportEnabled) {
      if (element instanceof TypeScriptClass) {
        result = ivy.get((TypeScriptClass)element);
      }
      else if (element instanceof TypeScriptField) {
        result = ivy.get((TypeScriptField)element);
      }
    }
    if (result == null
        && element instanceof TypeScriptClass
        && (!isIvyMetadataSupportEnabled || !hasIvyMetadata(element))
        && isAngular2Context(element)) {
      result = metadata.get((TypeScriptClass)element);
    }
    return result;
  }

  public static class SourceEntityGetter<T extends Angular2Entity> {

    private final Condition<? super JSImplicitElement> myImplicitElementTester;
    private final BiFunction<? super ES6Decorator, ? super JSImplicitElement, ? extends T> myEntityConstructor;
    private final String[] myDecoratorNames;

    private SourceEntityGetter(@NotNull Condition<? super JSImplicitElement> tester,
                               @NotNull BiFunction<? super ES6Decorator, ? super JSImplicitElement, ? extends T> constructor,
                               @NotNull String... names) {
      myImplicitElementTester = tester;
      myEntityConstructor = constructor;
      myDecoratorNames = names;
    }

    @Nullable
    public T get(@Nullable PsiElement element) {
      if (element instanceof JSImplicitElement) {
        if (!myImplicitElementTester.value((JSImplicitElement)element)) {
          return null;
        }
        element = element.getContext();
      }
      if (element instanceof TypeScriptClass) {
        ES6Decorator decorator = findDecorator((TypeScriptClass)element, myDecoratorNames);
        if (decorator != null) {
          element = decorator;
        }
        else {
          return null;
        }
      }
      else if (!(element instanceof ES6Decorator)
               || !isAngularDecorator((ES6Decorator)element, myDecoratorNames)) {
        return null;
      }
      ES6Decorator dec = (ES6Decorator)element;
      return CachedValuesManager.getCachedValue(dec, () -> {
        JSImplicitElement entityElement = null;
        if (dec.getIndexingData() != null) {
          entityElement = ContainerUtil.find(ObjectUtils.notNull(dec.getIndexingData().getImplicitElements(), Collections::emptyList),
                                             myImplicitElementTester);
        }
        return create(entityElement != null ? myEntityConstructor.apply(dec, entityElement) : null, dec);
      });
    }

    @Override
    public String toString() {
      return Arrays.toString(myDecoratorNames) + " - " + super.toString();
    }
  }

  public static class MetadataEntityGetter<T extends Angular2Entity> {

    private final Class<T> myEntityClass;

    private MetadataEntityGetter(@NotNull Class<T> entityClass) {
      myEntityClass = entityClass;
    }

    @Nullable
    public T get(@NotNull TypeScriptClass typeScriptClass) {
      String className = typeScriptClass.getName();
      if (className == null
          //check classes only from d.ts files
          || !Objects.requireNonNull(typeScriptClass.getAttributeList()).hasModifier(JSAttributeList.ModifierType.DECLARE)) {
        return null;
      }
      Ref<T> result = new Ref<>();
      StubIndex.getInstance().processElements(
        Angular2MetadataEntityClassNameIndex.KEY, className, typeScriptClass.getProject(),
        GlobalSearchScope.allScope(typeScriptClass.getProject()), Angular2MetadataEntity.class,
        e -> {
          if (e.isValid() && myEntityClass.isInstance(e) && e.getTypeScriptClass() == typeScriptClass) {
            //noinspection unchecked
            result.set((T)e);
            return false;
          }
          return true;
        });
      return result.get();
    }

    @Override
    public String toString() {
      return myEntityClass.getSimpleName() + " - " + super.toString();
    }
  }

  public static class IvyEntityGetter<T extends Angular2Entity,
    Def extends Angular2IvyEntityDef<T>> {

    private final Class<Def> myDefClass;
    private final Function<Def, ? extends T> myEntityConstructor;

    IvyEntityGetter(@NotNull Function<Def, ? extends T> constructor,
                    @NotNull Class<Def> defClass) {
      myEntityConstructor = constructor;
      myDefClass = defClass;
    }

    @Nullable
    public T get(@NotNull TypeScriptField field) {
      return doIfNotNull(tryCast(Angular2IvyEntityDef.get(field), myDefClass), this::get);
    }

    @Nullable
    public T get(@NotNull TypeScriptClass tsClass) {
      return doIfNotNull(tryCast(Angular2IvyEntityDef.get(tsClass), myDefClass), this::get);
    }

    @Nullable
    private T get(@NotNull Def entityDef) {
      return CachedValuesManager.getCachedValue(entityDef.getField(), () -> {
        return create(myEntityConstructor.apply(entityDef), entityDef.getField());
      });
    }

    @Override
    public String toString() {
      return myDefClass.getSimpleName() + " - " + super.toString();
    }
  }
}