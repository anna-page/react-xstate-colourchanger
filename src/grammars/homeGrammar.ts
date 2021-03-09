export const grammar = `

<grammar root="home">

<rule id="home">

<item repeat="0-1">please</item>

<one-of> 
<item><ruleref uri="#action1"/>
<tag>out.action1=rules.action1;</tag> 

the

<ruleref uri="#object1"/>
<tag>out.object1=rules.object1;</tag></item>

<item><ruleref uri="#action2"/>
<tag>out.action2=rules.action2;</tag> 

the

<ruleref uri="#object2"/>
<tag>out.object2=rules.object2;</tag></item>

<rule id="object1"> 
<one-of> 
<item> light </item> 
<item> heat </item> 
<item> AC <tag> out = 'air conditioning'; 
</tag></item> 
<item> air conditioning </item>
 </one-of> 
</rule>

<rule id="object2"> 
<one-of> 
 <item> window </item> 
 <item> door </item> 
 </one-of> 
 </rule>

 <rule id="action1"> 
<one-of> 
<item> turn on </item> 
<item> turn off </item> 
 </one-of> 
 </rule>

 <rule id="action2"> 
<one-of> 
<item> close </item> 
<item> open </item>
 </one-of> 
 </rule>


 </grammar>
 `