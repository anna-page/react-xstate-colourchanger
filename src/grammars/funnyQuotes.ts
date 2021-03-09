
export const grammar = `
<grammar root="quotes">

   <rule id="quotes">
      <ruleref uri="#person"/>
      <tag>out.person = rules.person.type;</tag>
   </rule>

   <rule id="kindofperson">
      <one-of>
         <item>do be do be do<tag>out="Sinatra";</tag></item>
         <item>to be is to do<tag>out="Sartre";</tag></item>
         <item>to do is to be<tag>out="Socrates";</tag></item>
      </one-of>
   </rule>

   <rule id="person">
      <ruleref uri="#kindofperson"/>
      <tag>out.type=rules.kindofperson;</tag>
   </rule>

</grammar>
`