<template>
  <div :title="'foo' | localFilter<weak_warning descr="Invalid number of filter arguments, expected 2">(12)</weak_warning>"></div>
  <div :title="false | localFilter('ss',<weak_warning descr="Argument type string is not assignable to parameter type number">'ss'</weak_warning>)"></div>
  <div :title="<weak_warning descr="Argument type number is not assignable to parameter type boolean">true | localFilter('str', 12)</weak_warning> | localFilter2('sss', 12)"></div>
  <div :title="true | <weak_warning descr="Incorrect filter function signature. The function should accept at least one argument">badFilter</weak_warning>"></div>
  <div :title="12 | <weak_warning descr="Unresolved filter unknownFilter">unknownFilter</weak_warning>(123)"></div>
</template>

<script lang="ts">
  import Component from "vue-property-decorator";

  @Component({
    filters: {
      localFilter: function (arg1: boolean, arg2: string, arg3: number): number {
        return (arg1 + arg2 + arg3) as number
      },
      localFilter2: function (arg1: boolean, arg2: string, arg3: number) {
        return arg1 + arg2 + arg3
      },
      badFilter: function (): string {
        return ""
      }
    }
  })
  export default class Hello {

  }
</script>
