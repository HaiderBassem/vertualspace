<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="lpc-tileset-terrain-summer" tilewidth="32" tileheight="32" tilecount="4096" columns="64">
 <image source="lpc-tileset-terrain-summer.png" width="2048" height="2048"/>
 <tile id="16">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="17">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="7.8125" y="32">
    <polygon points="0,0 6.625,-4.5625 9.5625,-7.25 14.625,-13.5 20.5,-18.0938 24.25,-20.0625 24.25,-32.125 20.5625,-29.4375 15.625,-27.8125 12.625,-24.375 10.625,-20.0625 6.25,-17.0625 6.25,-15.1875 2.1875,-14.625 -0.9375,-10.875 -3,-8.5625 -4.125,-6.4375 -4,-4.3125 -6.5,-3.71875 -7.6875,-2.5625 -7.75,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="18">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0" width="31.9375" height="8.0625"/>
  </objectgroup>
 </tile>
 <tile id="19">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.3125" y="32">
    <polygon points="0,0 -6.875,-4.0625 -8.25,-9.5 -18.5625,-20.8125 -21.625,-21.6563 -24.0625,-23.25 -24.25,-32.125 -18.375,-30.75 -15.4375,-27.625 -12.3125,-25.0625 -7.625,-22.75 -3.9375,-19.125 -1.375,-15 0.1875,-11.9375 1.9375,-10.0625 3.5625,-8.375 5.0625,-5.9375 6.375,-4.375 7.6875,-2.5625 7.75,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="20">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.0625" y="0.125" width="7.875" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="21">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.9375" y="0.125" width="7" height="7.875">
    <polygon points="-1.875,-0.0625 7.125,-0.0625 7.125,8.9375 4.21875,8.71875 2.1875,7.75 -1.78125,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="22">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="ledge" x="7.1875" y="0.1875" width="7" height="7.875">
    <polygon points="1,-0.0625 -7.125,-0.0625 -7.125,8.9375 -5.40625,8.90625 -2.5,6.6875 0.84375,2.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="23">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="15.8125" y="31.875">
    <polygon points="0,0 -2.875,-20.875 0.5625,-22.875 3.8125,-22.875 6.1875,-20.6875 6.4375,-19.3125 9.0625,-17.6875 10.8125,-15.9375 11.4375,-13.0625 12.8125,-13.0625 16.1875,-9.75 16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="24">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="16.25" y="31.9375">
    <polygon points="0,0 2.875,-20.875 -0.5625,-22.875 -3.8125,-22.875 -6.1875,-20.6875 -6.4375,-19.3125 -9.0625,-17.6875 -10.8125,-15.9375 -11.4375,-13.0625 -12.8125,-13.0625 -16.1875,-9.75 -16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="25">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
   <object id="3" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.0781,-15.3906 0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="25" duration="200"/>
   <frame tileid="28" duration="200"/>
  </animation>
 </tile>
 <tile id="27">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.0781,-15.3906 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="27" duration="200"/>
   <frame tileid="30" duration="200"/>
  </animation>
 </tile>
 <tile id="28">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.0781,-15.3906 0.09375,-15.4688"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="30">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.0781,-15.3906 -0.09375,-15.4688"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="31" type="above"/>
 <tile id="32" type="above"/>
 <tile id="33" type="above"/>
 <tile id="34" type="above"/>
 <tile id="35" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="15.8125" y="6.8125" width="16" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="35" duration="200"/>
   <frame tileid="38" duration="200"/>
   <frame tileid="41" duration="200"/>
   <frame tileid="44" duration="200"/>
  </animation>
 </tile>
 <tile id="36" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="-0.03125" y="6.375" width="32.0625" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="36" duration="200"/>
   <frame tileid="39" duration="200"/>
   <frame tileid="42" duration="200"/>
   <frame tileid="45" duration="200"/>
  </animation>
 </tile>
 <tile id="37" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="6.75" width="16" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="37" duration="200"/>
   <frame tileid="40" duration="200"/>
   <frame tileid="43" duration="200"/>
   <frame tileid="46" duration="200"/>
  </animation>
 </tile>
 <tile id="38" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="15.8125" y="6.8125" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="39" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.03125" y="6.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="40" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="6.75" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="41" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="15.8125" y="6.8125" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="42" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.03125" y="6.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="43" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="6.75" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="44" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="15.8125" y="6.8125" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="45" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.03125" y="6.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="46" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="6.75" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="47" type="bridge"/>
 <tile id="48" type="bridge"/>
 <tile id="49" type="bridge"/>
 <tile id="50" type="bridge"/>
 <tile id="51" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="52" type="bridge"/>
 <tile id="53" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="54" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="55" type="bridge"/>
 <tile id="56" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="57" type="bridge"/>
 <tile id="58" type="bridge"/>
 <tile id="59" type="bridge"/>
 <tile id="60" type="bridge"/>
 <tile id="61" type="bridge"/>
 <tile id="62" type="wood"/>
 <tile id="63" type="wood"/>
 <tile id="80">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="7.8125" y="-0.125">
    <polygon points="0,0 12.125,13.4375 18.25,19.5625 19.75,20 24.0625,24.125 24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,0.125"/>
   </object>
   <object id="3" name="Collision" type="cliff" x="7.8125" y="-0.125">
    <polygon points="24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="81">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="23.875">
    <polygon points="0,0 3.5,1.8125 6.25,4.625 7,8.0625 -0.0625,8.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="83">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="23.875">
    <polygon points="0,0 -2.5,0.5625 -7.6875,5.0625 -7.875,8.0625 0.0625,8.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="84">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.3125" y="-0.125">
    <polygon points="0,0 -12.125,13.4375 -18.25,19.5625 -19.75,20 -24.0625,24.125 -24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="24.3125" y="-0.125">
    <polygon points="-24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="85">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0,0 31.875,-0.0625 31.875,7.03125 7.71875,7.01563 7.875,31.75 0,31.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="86">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.125" y="0.1875" width="7.875" height="31.75">
    <polygon points="-24.0625,-0.125 7.875,-0.1875 7.875,31.75 0,31.75 0,7.875 -24.0625,7.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="87">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="12.875" width="8.8125" height="19.125"/>
   <object id="3" name="Collision" type="cliff" x="-0.0625" y="12.75">
    <polygon points="0,0 8.8125,0 14.5,8 23.125,14.4375 29.1875,16.8125 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="88">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="23.1875" y="12.875" width="8.8125" height="19.125"/>
   <object id="2" name="Collision" type="cliff" x="32.0625" y="12.75">
    <polygon points="0,0 -8.8125,0 -14.5,8 -23.125,14.4375 -29.1875,16.8125 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="89">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,0.0625"/>
   </object>
   <object id="2" name="Water" type="water" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,32.0625 -15.875,32.125 -15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="89" duration="200"/>
   <frame tileid="92" duration="200"/>
  </animation>
 </tile>
 <tile id="90">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="90" duration="200"/>
   <frame tileid="93" duration="200"/>
  </animation>
 </tile>
 <tile id="91">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,0.0625"/>
   </object>
   <object id="2" name="Water" type="water" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,32.0625 15.875,32.125 15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="91" duration="200"/>
   <frame tileid="94" duration="200"/>
  </animation>
 </tile>
 <tile id="92">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,0.0625"/>
   </object>
   <object id="2" name="Water" type="water" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,32.0625 -15.875,32.125 -15.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="93">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="94">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,0.0625"/>
   </object>
   <object id="2" name="Water" type="water" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,32.0625 15.875,32.125 15.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="95" type="above"/>
 <tile id="96" type="above"/>
 <tile id="97" type="above"/>
 <tile id="98" type="above"/>
 <tile id="99" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="16" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="99" duration="200"/>
   <frame tileid="102" duration="200"/>
   <frame tileid="105" duration="200"/>
   <frame tileid="108" duration="200"/>
  </animation>
 </tile>
 <tile id="100" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="-0.0625" y="14.375" width="32.0625" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="100" duration="200"/>
   <frame tileid="103" duration="200"/>
   <frame tileid="106" duration="200"/>
   <frame tileid="109" duration="200"/>
  </animation>
 </tile>
 <tile id="101" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
  <animation>
   <frame tileid="101" duration="200"/>
   <frame tileid="104" duration="200"/>
   <frame tileid="107" duration="200"/>
   <frame tileid="110" duration="200"/>
  </animation>
 </tile>
 <tile id="102" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="16" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="103" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.0625" y="14.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="104" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="105" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="16" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="106" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.0625" y="14.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="107" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="108" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="16" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="109" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.0625" y="14.375" width="32.0625" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="110" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="14.4375" width="16" height="17.625"/>
  </objectgroup>
 </tile>
 <tile id="111" type="bridge"/>
 <tile id="112" type="bridge"/>
 <tile id="113" type="bridge"/>
 <tile id="114" type="bridge"/>
 <tile id="115" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="116" type="bridge"/>
 <tile id="117" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="118" type="bridge"/>
 <tile id="119" type="bridge"/>
 <tile id="120" type="bridge"/>
 <tile id="121" type="bridge"/>
 <tile id="122" type="bridge"/>
 <tile id="123" type="bridge"/>
 <tile id="124" type="bridge"/>
 <tile id="125" type="bridge"/>
 <tile id="126" type="wood"/>
 <tile id="127" type="wood"/>
 <tile id="144">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="145">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="7.8125" y="-0.125">
    <polygon points="0,0 12.125,13.4375 18.25,19.5625 19.75,20 24.0625,24.125 24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="-0.125">
    <polygon points="24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="146">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="24" width="31.9375" height="8.0625"/>
  </objectgroup>
 </tile>
 <tile id="147">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.3125" y="-0.125">
    <polygon points="0,0 -12.125,13.4375 -18.25,19.5625 -19.75,20 -24.0625,24.125 -24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="24.3125" y="-0.125">
    <polygon points="-24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="148">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="149">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0,0 7.875,-0.0625 7.9375,24.875 31.9688,24.8438 32,31.9375 0,31.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="150">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="24.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0.375,-0.125 7.875,-0.1875 8,31.875 -24.0625,31.9375 -24.1875,23.9375 0.5,23.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="151">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="-0.1875" y="12.8125">
    <polygon points="3.25,-7 7.5,0 14.5,8 17.4375,10.9375 17.4375,19.1875 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0" y="24.9375" width="17.0625" height="7.0625"/>
  </objectgroup>
 </tile>
 <tile id="152">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="32" y="12.8125">
    <polygon points="-3.25,-7 -7.5,0 -14.1875,7 -17.375,8.875 -17.4375,19.1875 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="14.75" y="24.9375" width="17.0625" height="7.0625"/>
  </objectgroup>
 </tile>
 <tile id="153">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="20.875" y="-0.0625" width="11.125" height="17.75"/>
   <object id="3" name="Collision" type="cliff" x="0" y="0" width="20.8125" height="17.5625"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="153" duration="200"/>
   <frame tileid="156" duration="200"/>
  </animation>
 </tile>
 <tile id="154">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="154" duration="200"/>
   <frame tileid="157" duration="200"/>
  </animation>
 </tile>
 <tile id="155">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="7.75" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="0" width="24.1875" height="17.6875"/>
   <object id="3" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="155" duration="200"/>
   <frame tileid="158" duration="200"/>
  </animation>
 </tile>
 <tile id="156">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="20.875" y="-0.0625" width="11.125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="0" y="0" width="20.8125" height="17.5625"/>
   <object id="3" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="157">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="2" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
  </objectgroup>
 </tile>
 <tile id="158">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="7.75" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="0" width="24.1875" height="17.6875"/>
   <object id="3" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="159" type="above"/>
 <tile id="160">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="7" y="0" width="25" height="32"/>
  </objectgroup>
 </tile>
 <tile id="161">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="162">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="0" y="0" width="25" height="32"/>
  </objectgroup>
 </tile>
 <tile id="163" type="above">
  <animation>
   <frame tileid="163" duration="200"/>
   <frame tileid="166" duration="200"/>
   <frame tileid="169" duration="200"/>
   <frame tileid="172" duration="200"/>
  </animation>
 </tile>
 <tile id="164" type="above">
  <animation>
   <frame tileid="164" duration="200"/>
   <frame tileid="167" duration="200"/>
   <frame tileid="170" duration="200"/>
   <frame tileid="173" duration="200"/>
  </animation>
 </tile>
 <tile id="165" type="above">
  <animation>
   <frame tileid="165" duration="200"/>
   <frame tileid="168" duration="200"/>
   <frame tileid="171" duration="200"/>
   <frame tileid="174" duration="200"/>
  </animation>
 </tile>
 <tile id="166" type="above"/>
 <tile id="167" type="above"/>
 <tile id="168" type="above"/>
 <tile id="169" type="above"/>
 <tile id="170" type="above"/>
 <tile id="171" type="above"/>
 <tile id="172" type="above"/>
 <tile id="173" type="above"/>
 <tile id="174" type="above"/>
 <tile id="175" type="bridge"/>
 <tile id="176" type="bridge"/>
 <tile id="177" type="bridge"/>
 <tile id="178" type="bridge"/>
 <tile id="179" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="180" type="bridge"/>
 <tile id="181" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="182" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="31.997" height="20.6233">
    <polygon points="0.454545,17.4545 6.18108,10.0455 19.1803,5 31.9061,4 32.0089,8.07637 24.0956,8.11292 17.0468,10.1109 12.2128,13.0736 8.99929,16.1473 7.97331,20.9711 0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="183" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="32" height="8"/>
  </objectgroup>
 </tile>
 <tile id="184" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0401" y="0" width="31.997" height="20.6233">
    <polygon points="-0.454545,17.4545 -6.18108,10.0455 -19.1803,5 -31.9061,4 -32.0089,8.07637 -24.0956,8.11292 -17.0468,10.1109 -12.2128,13.0736 -8.99929,16.1473 -7.97331,20.9711 -0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="185" type="bridge"/>
 <tile id="186" type="bridge"/>
 <tile id="187" type="bridge"/>
 <tile id="188" type="bridge"/>
 <tile id="189" type="bridge"/>
 <tile id="190" type="wood"/>
 <tile id="191" type="wood"/>
 <tile id="208">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.0625" y="1">
    <polygon points="0,0 3.625,6.75 4.9375,12.0625 12.75,19.875 15.8125,25.5625 16.8125,31 31.9375,31 31.875,-1.0625 0.0625,-0.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="209">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="210">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="211">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="212">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.875" y="1">
    <polygon points="0,0 -3.625,6.75 -4.9375,12.0625 -12.75,19.875 -15.8125,25.5625 -16.8125,31 -31.9375,31 -31.875,-1.0625 -0.0625,-0.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="213">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="214">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="215">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="15.8125" y="31.875">
    <polygon points="0,0 -2.875,-20.875 0.5625,-22.875 3.8125,-22.875 6.1875,-20.6875 6.4375,-19.3125 9.0625,-17.6875 10.8125,-15.9375 11.4375,-13.0625 12.8125,-13.0625 16.1875,-9.75 16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="216">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="16.25" y="31.9375">
    <polygon points="0,0 2.875,-20.875 -0.5625,-22.875 -3.8125,-22.875 -6.1875,-20.6875 -6.4375,-19.3125 -9.0625,-17.6875 -10.8125,-15.9375 -11.4375,-13.0625 -12.8125,-13.0625 -16.1875,-9.75 -16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="217">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="217" duration="200"/>
   <frame tileid="219" duration="200"/>
  </animation>
 </tile>
 <tile id="218">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="218" duration="200"/>
   <frame tileid="220" duration="200"/>
  </animation>
 </tile>
 <tile id="219">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="220">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="221">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="221" duration="200"/>
   <frame tileid="478" duration="200"/>
  </animation>
 </tile>
 <tile id="222" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="222" duration="200"/>
   <frame tileid="479" duration="200"/>
  </animation>
 </tile>
 <tile id="223">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.1875" y="12.8125">
    <polygon points="3.25,-7 7.5,0 14.625,4.1875 20.875,7.625 29.1875,16.8125 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="224">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="7" y="0" width="25" height="30"/>
  </objectgroup>
 </tile>
 <tile id="225">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="0" y="0" width="32" height="31"/>
  </objectgroup>
 </tile>
 <tile id="226">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Wall" type="water" x="0" y="0" width="25" height="29"/>
  </objectgroup>
 </tile>
 <tile id="227" type="above">
  <animation>
   <frame tileid="227" duration="200"/>
   <frame tileid="230" duration="200"/>
   <frame tileid="233" duration="200"/>
   <frame tileid="236" duration="200"/>
  </animation>
 </tile>
 <tile id="228" type="above">
  <animation>
   <frame tileid="228" duration="200"/>
   <frame tileid="231" duration="200"/>
   <frame tileid="234" duration="200"/>
   <frame tileid="237" duration="200"/>
  </animation>
 </tile>
 <tile id="229" type="above">
  <animation>
   <frame tileid="229" duration="200"/>
   <frame tileid="232" duration="200"/>
   <frame tileid="235" duration="200"/>
   <frame tileid="238" duration="200"/>
  </animation>
 </tile>
 <tile id="230" type="above"/>
 <tile id="231" type="above"/>
 <tile id="232" type="above"/>
 <tile id="233" type="above"/>
 <tile id="234" type="above"/>
 <tile id="235" type="above"/>
 <tile id="236" type="above"/>
 <tile id="237" type="above"/>
 <tile id="238" type="above"/>
 <tile id="239" type="bridge"/>
 <tile id="240" type="bridge"/>
 <tile id="241" type="bridge"/>
 <tile id="242" type="bridge"/>
 <tile id="243" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="244" type="bridge"/>
 <tile id="245" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="246" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="247" type="bridge"/>
 <tile id="248" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="249" type="bridge"/>
 <tile id="250" type="bridge"/>
 <tile id="251" type="bridge"/>
 <tile id="252" type="bridge"/>
 <tile id="253" type="bridge"/>
 <tile id="254" type="wood"/>
 <tile id="255" type="wood"/>
 <tile id="272">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" x="16.875" y="0.25">
    <polygon points="0,0 1.1875,7.625 6.875,15.8125 9.8125,23.125 15,31.5 15.0625,-0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="273">
  <objectgroup draworder="index" id="3">
   <object id="2" name="Collision" type="cliff" x="-0.1875" y="12.8125">
    <polygon points="3.25,-7 7.5,0 14.5,8 23.125,14.4375 29.1875,16.8125 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="274">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="275">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="32" y="12.8125">
    <polygon points="-3.25,-7 -7.5,0 -14.5,8 -23.125,14.4375 -29.1875,16.8125 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="276">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="cliff" x="14.8125" y="0">
    <polygon points="0,0 -14.75,0 -14.8125,32 -11.625,28.0625 -7.875,19.125 -5.875,14.25 -2.625,11.1875 -1.1875,7.5 0.125,2.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="277">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="278">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="279">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="15.8125" y="31.875">
    <polygon points="0,0 -2.875,-20.875 0.5625,-22.875 3.8125,-22.875 6.1875,-20.6875 6.4375,-19.3125 9.0625,-17.6875 10.8125,-15.9375 11.4375,-13.0625 12.8125,-13.0625 16.1875,-9.75 16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="280">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="16.25" y="31.9375">
    <polygon points="0,0 2.875,-20.875 -0.5625,-22.875 -3.8125,-22.875 -6.1875,-20.6875 -6.4375,-19.3125 -9.0625,-17.6875 -10.8125,-15.9375 -11.4375,-13.0625 -12.8125,-13.0625 -16.1875,-9.75 -16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="281">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="281" duration="200"/>
   <frame tileid="283" duration="200"/>
  </animation>
 </tile>
 <tile id="282">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="282" duration="200"/>
   <frame tileid="284" duration="200"/>
  </animation>
 </tile>
 <tile id="283">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="284">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="285">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="285" duration="200"/>
   <frame tileid="542" duration="200"/>
  </animation>
 </tile>
 <tile id="286">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="286" duration="200"/>
   <frame tileid="543" duration="200"/>
  </animation>
 </tile>
 <tile id="287">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="32" y="12.8125">
    <polygon points="-4.0625,-4.1875 -10.1875,1.875 -18.8125,6.3125 -24.1875,10.9375 -29.1875,16.8125 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="291" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="9.8125" y="0">
    <polygon points="0,0 0.1875,11.5625 6.6875,17.4375 14.4375,19.625 22.0625,19.75 22.1875,0.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="291" duration="200"/>
   <frame tileid="294" duration="200"/>
   <frame tileid="297" duration="200"/>
   <frame tileid="300" duration="200"/>
  </animation>
 </tile>
 <tile id="292" type="above">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="waterfall" x="0" y="0.0625" width="32" height="19.8125"/>
  </objectgroup>
  <animation>
   <frame tileid="292" duration="200"/>
   <frame tileid="295" duration="200"/>
   <frame tileid="298" duration="200"/>
   <frame tileid="301" duration="200"/>
  </animation>
 </tile>
 <tile id="293" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="22.125" y="0">
    <polygon points="0,0 -0.1875,11.5625 -6.6875,17.4375 -14.4375,19.625 -22.0625,19.75 -22.1875,0.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="293" duration="200"/>
   <frame tileid="296" duration="200"/>
   <frame tileid="299" duration="200"/>
   <frame tileid="302" duration="200"/>
  </animation>
 </tile>
 <tile id="294" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="9.8125" y="0">
    <polygon points="0,0 0.1875,11.5625 6.6875,17.4375 14.4375,19.625 22.0625,19.75 22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="295" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0" y="0.0625" width="32" height="19.8125"/>
  </objectgroup>
 </tile>
 <tile id="296" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.125" y="0">
    <polygon points="0,0 -0.1875,11.5625 -6.6875,17.4375 -14.4375,19.625 -22.0625,19.75 -22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="297" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="9.8125" y="0">
    <polygon points="0,0 0.1875,11.5625 6.6875,17.4375 14.4375,19.625 22.0625,19.75 22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="298" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0" y="0.0625" width="32" height="19.8125"/>
  </objectgroup>
 </tile>
 <tile id="299" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.125" y="0">
    <polygon points="0,0 -0.1875,11.5625 -6.6875,17.4375 -14.4375,19.625 -22.0625,19.75 -22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="300" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="9.8125" y="0">
    <polygon points="0,0 0.1875,11.5625 6.6875,17.4375 14.4375,19.625 22.0625,19.75 22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="301" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0" y="0.0625" width="32" height="19.8125"/>
  </objectgroup>
 </tile>
 <tile id="302" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.125" y="0">
    <polygon points="0,0 -0.1875,11.5625 -6.6875,17.4375 -14.4375,19.625 -22.0625,19.75 -22.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="303" type="bridge"/>
 <tile id="304" type="bridge"/>
 <tile id="305" type="bridge"/>
 <tile id="306" type="bridge"/>
 <tile id="307" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="308" type="bridge"/>
 <tile id="309" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="310" type="bridge"/>
 <tile id="311" type="bridge"/>
 <tile id="312" type="bridge"/>
 <tile id="313" type="bridge"/>
 <tile id="314" type="bridge"/>
 <tile id="315" type="bridge"/>
 <tile id="316" type="bridge"/>
 <tile id="317" type="bridge"/>
 <tile id="318" type="wood"/>
 <tile id="319" type="wood"/>
 <tile id="336">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="337">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="7.8125" y="32">
    <polygon points="0,0 6.625,-4.5625 9.5625,-7.25 14.625,-13.5 20.5,-18.0938 24.25,-20.0625 24.25,-32.125 20.5625,-29.4375 15.625,-27.8125 12.625,-24.375 10.625,-20.0625 6.25,-17.0625 6.25,-15.1875 2.1875,-14.625 -0.9375,-10.875 -3,-8.5625 -4.125,-6.4375 -4,-4.3125 -6.5,-3.71875 -7.6875,-2.5625 -7.75,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="338">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.125" y="0.125" width="31.9375" height="8.0625"/>
  </objectgroup>
 </tile>
 <tile id="339">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="24.3125" y="32">
    <polygon points="0,0 -6.875,-4.0625 -8.25,-9.5 -18.5625,-20.8125 -21.625,-21.6563 -24.0625,-23.25 -24.25,-32.125 -18.375,-30.75 -15.4375,-27.625 -12.3125,-25.0625 -7.625,-22.75 -3.9375,-19.125 -1.375,-15 0.1875,-11.9375 1.9375,-10.0625 3.5625,-8.375 5.0625,-5.9375 6.375,-4.375 7.6875,-2.5625 7.75,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="340">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.125" y="0.125" width="7.875" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="341">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="24.9375" y="0.125" width="7" height="7.875">
    <polygon points="-1.875,-0.0625 7.125,-0.0625 7.125,8.9375 4.21875,8.71875 2.1875,7.75 -1.78125,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="342">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="7.1875" y="0.1875" width="7" height="7.875">
    <polygon points="1,-0.0625 -7.125,-0.0625 -7.125,8.9375 -5.40625,8.90625 -2.5,6.6875 0.84375,2.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="343">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="15.8125" y="31.875">
    <polygon points="0,0 -2.875,-20.875 0.5625,-22.875 3.8125,-22.875 6.1875,-20.6875 6.4375,-19.3125 9.0625,-17.6875 10.8125,-15.9375 11.4375,-13.0625 12.8125,-13.0625 16.1875,-9.75 16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="344">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="16.25" y="31.9375">
    <polygon points="0,0 2.875,-20.875 -0.5625,-22.875 -3.8125,-22.875 -6.1875,-20.6875 -6.4375,-19.3125 -9.0625,-17.6875 -10.8125,-15.9375 -11.4375,-13.0625 -12.8125,-13.0625 -16.1875,-9.75 -16.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="345">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="14.9375" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
  <animation>
   <frame tileid="345" duration="200"/>
   <frame tileid="347" duration="200"/>
  </animation>
 </tile>
 <tile id="346">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="17.125" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="0.0625" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
  <animation>
   <frame tileid="346" duration="200"/>
   <frame tileid="348" duration="200"/>
  </animation>
 </tile>
 <tile id="347">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="2" name="Collision" type="cliff" x="0" y="-0.0625" width="14.875" height="17.75"/>
   <object id="3" name="Ladder" type="climb" x="14.9375" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
 </tile>
 <tile id="348">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="17.125" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="0.0625" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
 </tile>
 <tile id="349">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="14.9375" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
  <animation>
   <frame tileid="349" duration="200"/>
   <frame tileid="606" duration="200"/>
  </animation>
 </tile>
 <tile id="350">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="17.125" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="0.0625" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
  <animation>
   <frame tileid="350" duration="200"/>
   <frame tileid="607" duration="200"/>
  </animation>
 </tile>
 <tile id="355" type="above">
  <animation>
   <frame tileid="355" duration="200"/>
   <frame tileid="357" duration="200"/>
   <frame tileid="359" duration="200"/>
   <frame tileid="361" duration="200"/>
  </animation>
 </tile>
 <tile id="356" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="15.875" width="23.125" height="16"/>
  </objectgroup>
  <animation>
   <frame tileid="356" duration="200"/>
   <frame tileid="358" duration="200"/>
   <frame tileid="360" duration="200"/>
   <frame tileid="362" duration="200"/>
  </animation>
 </tile>
 <tile id="357" type="above"/>
 <tile id="358" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="15.875" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="359" type="above"/>
 <tile id="360" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="15.875" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="361" type="above"/>
 <tile id="362" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="15.875" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="363" type="bridge"/>
 <tile id="364" type="bridge"/>
 <tile id="365" type="bridge"/>
 <tile id="366" type="bridge"/>
 <tile id="367" type="bridge"/>
 <tile id="368" type="bridge"/>
 <tile id="369" type="bridge"/>
 <tile id="370" type="bridge"/>
 <tile id="371" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="372" type="bridge"/>
 <tile id="373" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="374" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="31.997" height="20.6233">
    <polygon points="0.454545,17.4545 6.18108,10.0455 19.1803,5 31.9061,4 32.0089,8.07637 24.0956,8.11292 17.0468,10.1109 12.2128,13.0736 8.99929,16.1473 7.97331,20.9711 0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="375" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="32" height="8"/>
  </objectgroup>
 </tile>
 <tile id="376" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0401" y="0" width="31.997" height="20.6233">
    <polygon points="-0.454545,17.4545 -6.18108,10.0455 -19.1803,5 -31.9061,4 -32.0089,8.07637 -24.0956,8.11292 -17.0468,10.1109 -12.2128,13.0736 -8.99929,16.1473 -7.97331,20.9711 -0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="377" type="bridge"/>
 <tile id="378" type="bridge"/>
 <tile id="379" type="bridge"/>
 <tile id="380" type="bridge"/>
 <tile id="381" type="bridge"/>
 <tile id="382" type="wood"/>
 <tile id="383" type="wood"/>
 <tile id="400">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="7.8125" y="-0.125">
    <polygon points="0,0 12.125,13.4375 18.25,19.5625 19.75,20 24.0625,24.125 24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="-0.125">
    <polygon points="24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="401">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.0625" y="23.875">
    <polygon points="0,0 3.5,1.8125 6.25,4.625 7,8.0625 -0.0625,8.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="403">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="23.875">
    <polygon points="0,0 -2.5,0.5625 -7.6875,5.0625 -7.875,8.0625 0.0625,8.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="404">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.3125" y="-0.125">
    <polygon points="0,0 -12.125,13.4375 -18.25,19.5625 -19.75,20 -24.0625,24.125 -24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="24.3125" y="-0.125">
    <polygon points="-24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="405">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0,0 31.875,-0.0625 31.875,7.03125 7.71875,7.01563 7.875,31.75 0,31.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="406">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.125" y="0.1875" width="7.875" height="31.75">
    <polygon points="-24.0625,-0.125 7.875,-0.1875 7.875,31.75 0,31.75 0,7.875 -24.0625,7.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="407">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="12.875" width="8.8125" height="19.125"/>
   <object id="2" name="Collision" type="cliff" x="-0.0625" y="12.75">
    <polygon points="0,0 8.8125,0 14.5,8 23.125,14.4375 29.1875,16.8125 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="408">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="23.1875" y="12.875" width="8.8125" height="19.125"/>
   <object id="2" name="Collision" type="cliff" x="32.0625" y="12.75">
    <polygon points="0,0 -8.8125,0 -14.5,8 -23.125,14.4375 -29.1875,16.8125 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="409">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="5" name="Collision" type="cliff" x="0" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="3" name="Collision" type="cliff" x="25.1875" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="6" name="Collision" type="cliff" x="25.1875" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="4" name="Ladder" type="climb" x="6.9375" y="0" width="18.1875" height="17.6875"/>
   <object id="7" name="Ladder" type="climb" x="6.9375" y="0" width="18.1875" height="17.6875"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="8" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="409" duration="200"/>
   <frame tileid="411" duration="200"/>
  </animation>
 </tile>
 <tile id="410">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cliff" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="410" duration="200"/>
   <frame tileid="412" duration="200"/>
  </animation>
 </tile>
 <tile id="411">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="25.1875" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="3" name="Ladder" type="climb" x="6.9375" y="0" width="18.1875" height="17.6875"/>
   <object id="4" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="412">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cliff" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Water" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="413">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="25.1875" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="3" name="Ladder" type="climb" x="6.9375" y="0" width="18.1875" height="17.6875"/>
   <object id="4" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="413" duration="200"/>
   <frame tileid="670" duration="200"/>
  </animation>
 </tile>
 <tile id="414">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cliff" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="414" duration="200"/>
   <frame tileid="671" duration="200"/>
  </animation>
 </tile>
 <tile id="419" type="above">
  <animation>
   <frame tileid="419" duration="200"/>
   <frame tileid="421" duration="200"/>
   <frame tileid="423" duration="200"/>
   <frame tileid="425" duration="200"/>
  </animation>
 </tile>
 <tile id="420" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="0.0625" width="23.125" height="31.8125"/>
  </objectgroup>
  <animation>
   <frame tileid="420" duration="200"/>
   <frame tileid="422" duration="200"/>
   <frame tileid="424" duration="200"/>
   <frame tileid="426" duration="200"/>
  </animation>
 </tile>
 <tile id="421" type="above"/>
 <tile id="422" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="0.0625" width="23.125" height="31.8125"/>
  </objectgroup>
 </tile>
 <tile id="423" type="above"/>
 <tile id="424" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="0.0625" width="23.125" height="31.8125"/>
  </objectgroup>
 </tile>
 <tile id="425" type="above"/>
 <tile id="426" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="-0.125" y="0.0625" width="23.125" height="31.8125"/>
  </objectgroup>
 </tile>
 <tile id="427" type="bridge"/>
 <tile id="428" type="bridge"/>
 <tile id="429" type="bridge"/>
 <tile id="430" type="bridge"/>
 <tile id="431" type="bridge"/>
 <tile id="432" type="bridge"/>
 <tile id="433" type="bridge"/>
 <tile id="434" type="bridge"/>
 <tile id="435" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="436" type="bridge"/>
 <tile id="437" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="438" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="439" type="bridge"/>
 <tile id="440" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="441" type="bridge"/>
 <tile id="442" type="bridge"/>
 <tile id="443" type="bridge"/>
 <tile id="444" type="bridge"/>
 <tile id="445" type="bridge"/>
 <tile id="446" type="wood"/>
 <tile id="447" type="wood"/>
 <tile id="464">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.0625" y="1">
    <polygon points="0,0 3.625,6.75 4.9375,12.0625 12.75,19.875 15.8125,25.5625 16.8125,31 31.9375,31 31.875,-1.0625 0.0625,-0.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="465">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="7.8125" y="-0.125">
    <polygon points="0,0 12.125,13.4375 18.25,19.5625 19.75,20 24.0625,24.125 24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="-0.125">
    <polygon points="24.25,32.125 19.1875,28.9375 15.75,25 12.3125,25.0625 6.0625,19.625 5.9375,17.25 4.3125,14.8125 2.4375,11.6875 0.25,9.875 -2.125,8.5 -4.625,5.8125 -6.375,3.0625 -7.6875,2.5625 -7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="466">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="24" width="31.9375" height="8.0625"/>
  </objectgroup>
 </tile>
 <tile id="467">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.3125" y="-0.125">
    <polygon points="0,0 -12.125,13.4375 -18.25,19.5625 -19.75,20 -24.0625,24.125 -24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,0.125"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="24.3125" y="-0.125">
    <polygon points="-24.25,32.125 -19.1875,28.9375 -15.75,25 -12.3125,25.0625 -6.0625,19.625 -5.9375,17.25 -4.3125,14.8125 -2.4375,11.6875 -0.25,9.875 2.125,8.5 4.625,5.8125 6.375,3.0625 7.6875,2.5625 7.75,32.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="468">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.875" y="1">
    <polygon points="0,0 -3.625,6.75 -4.9375,12.0625 -12.75,19.875 -15.8125,25.5625 -16.8125,31 -31.9375,31 -31.875,-1.0625 -0.0625,-0.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="469">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0,0 7.875,-0.0625 7.9375,24.875 31.9688,24.8438 32,31.9375 0,31.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="470">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="24.0625" y="0.125" width="7.875" height="31.75">
    <polygon points="0.375,-0.125 7.875,-0.1875 8,31.875 -24.0625,31.9375 -24.1875,23.9375 0.5,23.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="471">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="-0.1875" y="12.8125">
    <polygon points="5.25,-9.25 11.3125,-2 16.75,5.4375 16.6875,19.375 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0.0625" y="24.8125" width="16.375" height="7.25"/>
  </objectgroup>
 </tile>
 <tile id="472">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="32" y="12.8125">
    <polygon points="-5.25,-9.25 -11.3125,-2 -16.75,5.4375 -16.6875,19.375 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="15.375" y="24.8125" width="16.375" height="7.25"/>
  </objectgroup>
 </tile>
 <tile id="473">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="20.875" y="-0.0625" width="11.125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="0" y="0" width="20.8125" height="17.5625"/>
   <object id="3" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="473" duration="200"/>
   <frame tileid="537" duration="200"/>
  </animation>
 </tile>
 <tile id="474">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="474" duration="200"/>
   <frame tileid="538" duration="200"/>
  </animation>
 </tile>
 <tile id="475">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="7.75" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="0" width="24.1875" height="17.6875"/>
   <object id="3" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="475" duration="200"/>
   <frame tileid="539" duration="200"/>
  </animation>
 </tile>
 <tile id="478">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="221" duration="200"/>
   <frame tileid="478" duration="200"/>
  </animation>
 </tile>
 <tile id="479">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="222" duration="200"/>
   <frame tileid="479" duration="200"/>
  </animation>
 </tile>
 <tile id="480">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.0781,-15.3906 0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="480" duration="200"/>
   <frame tileid="608" duration="200"/>
  </animation>
 </tile>
 <tile id="482">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.0781,-15.3906 -0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="482" duration="200"/>
   <frame tileid="610" duration="200"/>
  </animation>
 </tile>
 <tile id="483" type="above">
  <animation>
   <frame tileid="483" duration="200"/>
   <frame tileid="485" duration="200"/>
   <frame tileid="487" duration="200"/>
   <frame tileid="489" duration="200"/>
  </animation>
 </tile>
 <tile id="484" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="0" width="23.125" height="16"/>
  </objectgroup>
  <animation>
   <frame tileid="484" duration="200"/>
   <frame tileid="486" duration="200"/>
   <frame tileid="488" duration="200"/>
   <frame tileid="490" duration="200"/>
  </animation>
 </tile>
 <tile id="485" type="above"/>
 <tile id="486" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="0" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="487" type="above"/>
 <tile id="488" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="0" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="489" type="above"/>
 <tile id="490" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0625" y="0" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="491" type="bridge"/>
 <tile id="492" type="bridge"/>
 <tile id="493" type="bridge"/>
 <tile id="494" type="bridge"/>
 <tile id="495" type="bridge"/>
 <tile id="496" type="bridge"/>
 <tile id="497" type="bridge"/>
 <tile id="498" type="bridge"/>
 <tile id="499" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="500" type="bridge"/>
 <tile id="501" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="502" type="bridge"/>
 <tile id="503" type="bridge"/>
 <tile id="504" type="bridge"/>
 <tile id="505" type="bridge"/>
 <tile id="506" type="bridge"/>
 <tile id="507" type="bridge"/>
 <tile id="508" type="bridge"/>
 <tile id="509" type="bridge"/>
 <tile id="510" type="wood"/>
 <tile id="511" type="wood"/>
 <tile id="512">
  <objectgroup draworder="index" id="4">
   <object id="20" name="Bush" type="bush" x="0" y="0" width="32" height="32">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="513">
  <objectgroup draworder="index" id="2">
   <object id="5" name="Bush" type="bush" x="28.8125" y="27.0625">
    <polygon points="0,0 -4.125,3.9375 -22.9375,3.875 -25.8125,0.6875 -26.125,-2.8125 -28.875,-5.5 -29.0625,-11.875 -27.5,-17.0625 -22,-23.875 -15.625,-26 -10.375,-26.0625 -3.875,-23.875 -0.3125,-20.125 1.75,-17.1875 2.875,-12.0625 2.9375,-7.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="514">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="12.2727" y="0.147727">
    <polygon points="0,0 5.75,0.0625 8.6875,2.9375 13.75,2.875 17.875,7.125 18.8125,12 19.75,14 19.875,21.9375 17.75,27.375 12.75,31.1875 6.9375,31.0625 3.375,28.4375 -0.1875,31.125 -6.1875,31.125 -11.125,24.8125 -12.0625,16.75 -12.1875,8 -11.0625,5.8125 -7.9375,4.125 -4,2.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="515">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="11.75" y="-0.125">
    <polygon points="-0.75,0 4.75,0 8.6875,2.9375 12.125,1.25 18.0625,1.125 20,3.4375 19.9063,8.875 16.9531,11.5 19.75,14 19.8125,15.875 17.1563,19.8125 19.9375,26.375 19.9063,29.2188 15.8125,32.125 12.1875,32 9.375,29.1563 6.0625,32.0625 0.9375,31.9375 -1.5625,29.9375 -4.0625,31.9688 -7.9375,32.0625 -10,29.9688 -10,24.7969 -7.46875,22.6484 -11.9375,19 -11.875,14.1875 -9.4375,11.875 -11.8125,6.875 -11.9375,4.0625 -8.6875,2 -2.46875,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="516">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="11.875" y="-0.125">
    <polygon points="-2.875,0.9375 0.75,5.0625 4.9375,2.0625 7.5625,3.875 13.2188,0.15625 20.0625,0.1875 19.9375,6 15.0313,10.5625 16.9531,11.5 19.875,13.125 19.8125,15.125 16.3438,18.625 19.9375,26.375 19.8438,32.0938 15.8125,32.125 9.3125,27.3125 9,28.9688 6.0625,32.0625 3.875,31.9375 0.3125,28.3125 -6.875,31.9688 -11.125,32.0625 -11.125,28.0313 -9.0625,24.7969 -7.28125,22.3984 -7.25,20.25 -11.8125,16.9375 -11.875,15.0625 -8.21875,13.0938 -8.125,6.1875 -11.875,5.9375 -12.0625,0.0625 -6.09375,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="517">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="12" y="0">
    <polygon points="-2.875,1.8125 0.75,5.0625 3.1875,7 6.125,4.1875 11.0625,1.0625 14.7188,0.15625 20.0625,0.1875 19.9375,4.0625 13.9063,9.8125 17.1406,11.0625 19.875,13.125 20.0625,18.9375 14.7031,19.375 18.7188,24 20,27.375 18.8438,30.9063 13.9375,31.0625 8.5625,26.125 7.75,28.0938 5.25,32.0625 2.25,32.125 -1,28.75 -2.875,25.0938 -7.25,30.1875 -12,29.8438 -12.0625,26.1094 -10.8438,23.2109 -9.1875,20.4375 -11.875,18.8125 -11.875,15.9375 -8.84375,13.0313 -6.25,12.6875 -12,3.1875 -12.0625,0.0625 -6.96875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="518" type="above"/>
 <tile id="519" type="above"/>
 <tile id="520" type="above"/>
 <tile id="521" type="above"/>
 <tile id="522" type="above"/>
 <tile id="523" type="above"/>
 <tile id="528">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="16.8125" y="0.125">
    <polygon points="0,0 1.1875,7.625 6.875,15.8125 9.8125,23.125 15,31.5 15.0625,-0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="529">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="-0.1875" y="12.8125">
    <polygon points="5.25,-9.25 11.3125,-2 16.75,5.4375 23.5,11.6875 28.875,15.0625 31.1875,19.1875 32.0625,19.1875 32.125,-12.6875 0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="530">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="531">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="32" y="12.8125">
    <polygon points="-5.25,-9.25 -11.3125,-2 -16.75,5.4375 -23.5,11.6875 -28.875,15.0625 -31.1875,19.1875 -32.0625,19.1875 -32.125,-12.6875 -0.0625,-12.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="532">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="14.875" y="0.0625">
    <polygon points="0,0 -14.75,0 -14.8125,32 -11.625,28.0625 -7.875,19.125 -5.875,14.25 -2.625,11.1875 -1.1875,7.5 0.125,2.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="533">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="534">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="535" type="dirt"/>
 <tile id="536" type="dirt"/>
 <tile id="537" type="dirt">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="20.875" y="-0.0625" width="11.125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="0" y="0" width="20.8125" height="17.5625"/>
   <object id="3" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="473" duration="200"/>
   <frame tileid="537" duration="200"/>
  </animation>
 </tile>
 <tile id="538" type="dirt">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="474" duration="200"/>
   <frame tileid="538" duration="200"/>
  </animation>
 </tile>
 <tile id="539">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="7.75" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="7.8125" y="0" width="24.1875" height="17.6875"/>
   <object id="3" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="475" duration="200"/>
   <frame tileid="539" duration="200"/>
  </animation>
 </tile>
 <tile id="542">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.168,7.56641 -21.5205,-2.67285 -16.1855,-7.72461 -9.01563,-15.3281 -0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="285" duration="200"/>
   <frame tileid="542" duration="200"/>
  </animation>
 </tile>
 <tile id="543">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.168,7.56641 21.5205,-2.67285 16.1855,-7.72461 9.01563,-15.3281 0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="286" duration="200"/>
   <frame tileid="543" duration="200"/>
  </animation>
 </tile>
 <tile id="544">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,0.0625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,32.0625 -15.875,32.125 -15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="544" duration="200"/>
   <frame tileid="672" duration="200"/>
  </animation>
 </tile>
 <tile id="545">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="545" duration="200"/>
   <frame tileid="673" duration="200"/>
  </animation>
 </tile>
 <tile id="546">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,0.0625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,32.0625 15.875,32.125 15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="546" duration="200"/>
   <frame tileid="674" duration="200"/>
  </animation>
 </tile>
 <tile id="547" type="above">
  <animation>
   <frame tileid="547" duration="200"/>
   <frame tileid="549" duration="200"/>
   <frame tileid="551" duration="200"/>
   <frame tileid="553" duration="200"/>
  </animation>
 </tile>
 <tile id="548" type="above"/>
 <tile id="549" type="above"/>
 <tile id="550" type="above"/>
 <tile id="551" type="above"/>
 <tile id="552" type="above"/>
 <tile id="553" type="above"/>
 <tile id="554" type="above"/>
 <tile id="555" type="bridge"/>
 <tile id="556" type="bridge"/>
 <tile id="557" type="bridge"/>
 <tile id="558" type="bridge"/>
 <tile id="559" type="bridge"/>
 <tile id="560" type="bridge"/>
 <tile id="561" type="bridge"/>
 <tile id="562" type="bridge"/>
 <tile id="563" type="bridge"/>
 <tile id="564" type="bridge"/>
 <tile id="565" type="bridge"/>
 <tile id="566" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="31.997" height="20.6233">
    <polygon points="0.454545,17.4545 6.18108,10.0455 19.1803,5 31.9061,4 32.0089,8.07637 24.0956,8.11292 17.0468,10.1109 12.2128,13.0736 8.99929,16.1473 7.97331,20.9711 0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="567" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="32" height="8"/>
  </objectgroup>
 </tile>
 <tile id="568" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0401" y="0" width="31.997" height="20.6233">
    <polygon points="-0.454545,17.4545 -6.18108,10.0455 -19.1803,5 -31.9061,4 -32.0089,8.07637 -24.0956,8.11292 -17.0468,10.1109 -12.2128,13.0736 -8.99929,16.1473 -7.97331,20.9711 -0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="569" type="bridge"/>
 <tile id="570" type="bridge"/>
 <tile id="571" type="bridge"/>
 <tile id="572" type="bridge"/>
 <tile id="573" type="bridge"/>
 <tile id="574" type="wood"/>
 <tile id="575" type="wood"/>
 <tile id="576">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="0" y="0" width="31.9375" height="32">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="577">
  <objectgroup draworder="index" id="3">
   <object id="7" name="Collision" type="plant" x="28.9375" y="27">
    <polygon points="0,0 -4.125,3.9375 -22.9375,3.875 -25.8125,0.6875 -26.125,-2.8125 -28.875,-5.5 -29.0625,-11.875 -27.5,-17.0625 -22,-23.875 -15.625,-26 -10.375,-26.0625 -3.875,-23.875 -0.3125,-20.125 1.75,-17.1875 2.875,-12.0625 2.9375,-7.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="578">
  <objectgroup>
   <object id="1" name="Bush" type="bush" x="12.2727" y="0.147727">
    <polygon points="0,0 5.75,0.0625 8.6875,2.9375 13.75,2.875 17.875,7.125 18.8125,12 19.75,14 19.875,21.9375 17.75,27.375 12.75,31.1875 6.9375,31.0625 3.375,28.4375 -0.1875,31.125 -6.1875,31.125 -11.125,24.8125 -12.0625,16.75 -12.1875,8 -11.0625,5.8125 -7.9375,4.125 -4,2.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="579">
  <objectgroup>
   <object id="1" name="Bush" type="bush" x="11.75" y="-0.125">
    <polygon points="-0.75,0 4.75,0 8.6875,2.9375 12.125,1.25 18.0625,1.125 20,3.4375 19.9063,8.875 16.9531,11.5 19.75,14 19.8125,15.875 17.1563,19.8125 19.9375,26.375 19.9063,29.2188 15.8125,32.125 12.1875,32 9.375,29.1563 6.0625,32.0625 0.9375,31.9375 -1.5625,29.9375 -4.0625,31.9688 -7.9375,32.0625 -10,29.9688 -10,24.7969 -7.46875,22.6484 -11.9375,19 -11.875,14.1875 -9.4375,11.875 -11.8125,6.875 -11.9375,4.0625 -8.6875,2 -2.46875,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="580">
  <objectgroup>
   <object id="1" name="Bush" type="bush" x="11.875" y="-0.125">
    <polygon points="-2.875,0.9375 0.75,5.0625 4.9375,2.0625 7.5625,3.875 13.2188,0.15625 20.0625,0.1875 19.9375,6 15.0313,10.5625 16.9531,11.5 19.875,13.125 19.8125,15.125 16.3438,18.625 19.9375,26.375 19.8438,32.0938 15.8125,32.125 9.3125,27.3125 9,28.9688 6.0625,32.0625 3.875,31.9375 0.3125,28.3125 -6.875,31.9688 -11.125,32.0625 -11.125,28.0313 -9.0625,24.7969 -7.28125,22.3984 -7.25,20.25 -11.8125,16.9375 -11.875,15.0625 -8.21875,13.0938 -8.125,6.1875 -11.875,5.9375 -12.0625,0.0625 -6.09375,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="581">
  <objectgroup>
   <object id="1" name="Bush" type="bush" x="12" y="0">
    <polygon points="-2.875,1.8125 0.75,5.0625 3.1875,7 6.125,4.1875 11.0625,1.0625 14.7188,0.15625 20.0625,0.1875 19.9375,4.0625 13.9063,9.8125 17.1406,11.0625 19.875,13.125 20.0625,18.9375 14.7031,19.375 18.7188,24 20,27.375 18.8438,30.9063 13.9375,31.0625 8.5625,26.125 7.75,28.0938 5.25,32.0625 2.25,32.125 -1,28.75 -2.875,25.0938 -7.25,30.1875 -12,29.8438 -12.0625,26.1094 -10.8438,23.2109 -9.1875,20.4375 -11.875,18.8125 -11.875,15.9375 -8.84375,13.0313 -6.25,12.6875 -12,3.1875 -12.0625,0.0625 -6.96875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="582">
  <objectgroup draworder="index" id="3">
   <object id="5" name="Above" type="above" x="2.25" y="0.1875" width="22.4375" height="6.8125"/>
   <object id="6" name="Collision" type="hedge" x="2.1875" y="7.25">
    <polygon points="0,0 20.75,-0.125 22.8125,6.875 21.75,20.625 13.625,23.5 2.625,21.625 -0.1875,11.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="583">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Above" type="above" x="4.0625" y="-0.125" width="22.75" height="7.4375"/>
   <object id="3" name="Collision" type="hedge" x="4.25" y="7.4375">
    <polygon points="0,0 21.625,-0.1875 24.5625,3.8125 24.5,14 10.5,23.4375 6.5,23.375 -4.125,14.4375 -3.3125,3.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="584">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Above" type="above" x="3.1875" y="-0.0625" width="22.625" height="15.25"/>
   <object id="3" name="Collision" type="hedge" x="3.1875" y="15.1875">
    <polygon points="0,0 22.9375,0 23.6875,4.6875 16.0625,14.625 7.9375,14.75 4.5625,12.25 -0.125,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="585">
  <objectgroup draworder="index" id="3">
   <object id="2" name="Collision" type="plant" x="-0.1875" y="25">
    <polygon points="0,0 9.125,-0.125 23.9375,-6.0625 32.0625,-12.25 32.125,-25.0625 11.0625,-24.9375 13.0625,-22.25 19.25,-19.8125 13.6875,-13.6875 9.375,-8.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="586">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="plant" x="0.125" y="-0.0625" width="32.25" height="24.875"/>
  </objectgroup>
 </tile>
 <tile id="587">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="plant" x="12.75" y="-0.0625">
    <polygon points="0,0 6.125,11.4375 5.1875,13.3125 -9.875,16.0625 -9.5,21.625 -6.625,25.625 -8.4375,27 -12.9375,24.9375 -12.875,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="592">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="18.875" y="21.125" width="13.0625" height="11"/>
   <object id="2" name="Collision" type="ledge" x="0.0625" y="24.0625" width="18.75" height="8"/>
  </objectgroup>
 </tile>
 <tile id="593">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="21.0625" width="32" height="10.875"/>
  </objectgroup>
 </tile>
 <tile id="594">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0.0625" y="21.125" width="8.8125" height="11"/>
   <object id="2" name="Collision" type="ledge" x="8.875" y="24.0625" width="23.0625" height="8"/>
  </objectgroup>
 </tile>
 <tile id="595">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="18.875" y="21.125" width="13.0625" height="11"/>
   <object id="2" name="Collision" type="ledge" x="0.0625" y="24.0625" width="18.75" height="8"/>
  </objectgroup>
 </tile>
 <tile id="596">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Vine" type="climb" x="0" y="21.0625" width="32" height="10.875"/>
  </objectgroup>
 </tile>
 <tile id="597">
  <objectgroup draworder="index" id="2">
   <object id="3" name="Vine" type="climb" x="0.0625" y="21.125" width="8.8125" height="11"/>
   <object id="5" name="Collision" type="ledge" x="8.875" y="24.0625" width="23.0625" height="8"/>
  </objectgroup>
 </tile>
 <tile id="598">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Entrance Roof" type="above" x="2.90909" y="31.7273">
    <polygon points="0.078125,0.25 0.181818,-8.81818 4.90909,-17.0909 7.72727,-20.6364 16.9091,-20.6364 20.8182,-17.3636 22.2727,-12.6364 23.3636,-9.72727 25.2727,-5.18182 26,-4 26.0568,0.275568 29.1094,0.288352 29.1065,-31.7244 -2.92188,-31.7429 -2.74006,0.257102"/>
   </object>
   <object id="3" name="Entrance" type="cave" x="2.90909" y="31.7273">
    <polygon points="0.078125,0.25 0.181818,-8.81818 4.90909,-17.0909 7.72727,-20.6364 16.9091,-20.6364 20.8182,-17.3636 22.2727,-12.6364 23.3636,-9.72727 25.2727,-5.18182 26,-4 26.0568,0.275568"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="602">
  <objectgroup>
   <object id="1" name="Cliff" type="climb" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="603">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="0" width="6.9375" height="31.9654"/>
   <object id="2" name="Collision" type="cliff" x="24.9375" y="0" width="7.125" height="31.9565"/>
   <object id="3" name="Ladder" type="climb" x="6.9375" y="0" width="17.9375" height="31.9958"/>
  </objectgroup>
 </tile>
 <tile id="604">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="0" width="14.8125" height="32.0279"/>
   <object id="3" name="Ladder" type="climb" x="15" y="0" width="17" height="31.9958"/>
  </objectgroup>
 </tile>
 <tile id="605">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="cliff" x="17" y="0" width="15.0625" height="32.0815"/>
   <object id="3" name="Ladder" type="climb" x="0.1875" y="0.0625" width="16.75" height="31.9958"/>
  </objectgroup>
 </tile>
 <tile id="606">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
   <object id="3" name="Ladder" type="climb" x="14.9375" y="-0.0625" width="17" height="17.75"/>
  </objectgroup>
  <animation>
   <frame tileid="349" duration="200"/>
   <frame tileid="606" duration="200"/>
  </animation>
 </tile>
 <tile id="607">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="17.125" y="-0.0625" width="14.875" height="17.75"/>
   <object id="2" name="Ladder" type="climb" x="0.0625" y="-0.0625" width="17" height="17.75"/>
   <object id="3" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="350" duration="200"/>
   <frame tileid="607" duration="200"/>
  </animation>
 </tile>
 <tile id="608">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="15.4375">
    <polygon points="0,0 16.0625,16.4375 0.25,16.5625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="-0.125" y="15.4375">
    <polygon points="0,0 8.03125,8.21875 16.0625,16.4375 32.1953,16.5859 32.0781,-15.3906 0.09375,-15.4688"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="480" duration="200"/>
   <frame tileid="608" duration="200"/>
  </animation>
 </tile>
 <tile id="610">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="32.0703" y="15.4375">
    <polygon points="0,0 -8.03125,8.21875 -16.0625,16.4375 -32.1953,16.5859 -32.0781,-15.3906 -0.09375,-15.4688"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0703" y="15.4375">
    <polygon points="0,0 -16.0625,16.4375 -0.25,16.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="482" duration="200"/>
   <frame tileid="610" duration="200"/>
  </animation>
 </tile>
 <tile id="611" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="9.0625" y="31.9375">
    <polygon points="0,0 0.3125,-8.75 6.1875,-14.3125 13,-17.125 22.875,-17.1875 22.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="611" duration="200"/>
   <frame tileid="613" duration="200"/>
   <frame tileid="615" duration="200"/>
   <frame tileid="617" duration="200"/>
  </animation>
 </tile>
 <tile id="612" type="above"/>
 <tile id="613" type="above"/>
 <tile id="614" type="above"/>
 <tile id="615" type="above"/>
 <tile id="616" type="above"/>
 <tile id="617" type="above"/>
 <tile id="618" type="above"/>
 <tile id="619" type="bridge"/>
 <tile id="620" type="bridge"/>
 <tile id="621" type="bridge"/>
 <tile id="622" type="bridge"/>
 <tile id="623" type="bridge"/>
 <tile id="624" type="bridge"/>
 <tile id="625" type="bridge"/>
 <tile id="626" type="bridge"/>
 <tile id="627" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="628" type="bridge"/>
 <tile id="629" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="630" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="631" type="bridge"/>
 <tile id="632" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="633" type="bridge"/>
 <tile id="634" type="bridge"/>
 <tile id="635" type="bridge"/>
 <tile id="636" type="bridge"/>
 <tile id="637" type="wood"/>
 <tile id="638" type="wood"/>
 <tile id="639" type="wood"/>
 <tile id="642" type="above"/>
 <tile id="643" type="above"/>
 <tile id="644">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="bush" x="10" y="32.1875">
    <polygon points="0,0 11.0625,-0.1875 14.125,-3.5 17.3125,-4.5625 19,-6.4375 18.75,-16.4375 15.9375,-19.8125 16.0625,-23.125 15,-24.3125 7.1875,-25.3125 7,-27 5.8125,-28.375 2.9375,-29.25 -0.0625,-29.3125 -1.0625,-28.3125 -1.0625,-22.6875 -2.9375,-17.4375 -3.125,-10.5 -4.9375,-10.375 -5,-6.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="645">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="646">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="647">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="648">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="649">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="650">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="651">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="652">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="653">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="654">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="655">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="656">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="22.0625" y="-0.0625" width="9.9375" height="28.9375"/>
   <object id="2" name="Collision" type="cliff" x="0.0625" y="0" width="21.9375" height="28.875"/>
  </objectgroup>
 </tile>
 <tile id="657">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="29"/>
  </objectgroup>
 </tile>
 <tile id="658">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0.0625" y="-0.0625" width="9.9375" height="29"/>
   <object id="2" name="Collision" type="cliff" x="10.0625" y="0" width="21.9375" height="28.9375"/>
  </objectgroup>
 </tile>
 <tile id="659">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="22.0625" y="-0.0625" width="9.9375" height="32"/>
   <object id="3" name="Collision" type="cliff" x="0.0625" y="0" width="21.9375" height="32"/>
  </objectgroup>
 </tile>
 <tile id="660">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="32.0625"/>
  </objectgroup>
 </tile>
 <tile id="661">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0.0625" y="-0.0625" width="7" height="32"/>
   <object id="2" name="Collision" type="cliff" x="7.0625" y="0" width="24.9375" height="32"/>
  </objectgroup>
 </tile>
 <tile id="662">
  <objectgroup>
   <object id="1" name="Collision" type="Cliff" x="29.0222" y="0.0184659" width="2.97778" height="31.9815"/>
   <object id="2" name="Entrance" type="cave" x="2.04444" y="0" width="26.9456" height="31.9815"/>
   <object id="3" name="Collision" type="Cliff" x="0.0224736" y="0.0156295" width="1.99341" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="663">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="27" y="-0.0909091" width="5" height="32.0909"/>
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="26.9901" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="664">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="32.0057" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="665">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="27" y="-0.0909091" width="5" height="32.0909"/>
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="26.9901" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="666">
  <objectgroup>
   <object id="1" name="Cliff" type="climb" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="667">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="0" width="6.9375" height="32.0904"/>
   <object id="2" name="Collision" type="cliff" x="24.9375" y="0" width="7.125" height="32.0815"/>
   <object id="3" name="Ladder" type="climb" x="6.9375" y="0" width="17.9375" height="32.0583"/>
  </objectgroup>
 </tile>
 <tile id="668">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="0" width="14.875" height="32.0279"/>
   <object id="3" name="Ladder" type="climb" x="14.875" y="0" width="17.1875" height="32.0583"/>
  </objectgroup>
 </tile>
 <tile id="669">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="cliff" x="17.0625" y="0" width="15" height="32.019"/>
   <object id="3" name="Ladder" type="climb" x="0.125" y="0.0625" width="16.8125" height="31.9958"/>
  </objectgroup>
 </tile>
 <tile id="670">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="25.1875" y="-0.0625" width="6.8125" height="17.75"/>
   <object id="3" name="Ladder" type="climb" x="6.9375" y="0" width="18.1875" height="17.6875"/>
   <object id="4" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="413" duration="200"/>
   <frame tileid="670" duration="200"/>
  </animation>
 </tile>
 <tile id="671">
  <objectgroup>
   <object id="1" name="Cliff" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="414" duration="200"/>
   <frame tileid="671" duration="200"/>
  </animation>
 </tile>
 <tile id="672">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,0.0625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="15.8125" y="-0.0625">
    <polygon points="0,0 16.125,15.25 16.1875,32.0625 -15.875,32.125 -15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="544" duration="200"/>
   <frame tileid="672" duration="200"/>
  </animation>
 </tile>
 <tile id="673">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
  <animation>
   <frame tileid="545" duration="200"/>
   <frame tileid="673" duration="200"/>
  </animation>
 </tile>
 <tile id="674">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,0.0625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="16.125" y="-0.0625">
    <polygon points="0,0 -16.125,15.25 -16.1875,32.0625 15.875,32.125 15.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="546" duration="200"/>
   <frame tileid="674" duration="200"/>
  </animation>
 </tile>
 <tile id="675" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="7.75" y="-0.0625" width="24.25" height="32"/>
  </objectgroup>
  <animation>
   <frame tileid="675" duration="200"/>
   <frame tileid="677" duration="200"/>
   <frame tileid="679" duration="200"/>
   <frame tileid="681" duration="200"/>
  </animation>
 </tile>
 <tile id="676" type="above"/>
 <tile id="677" type="above"/>
 <tile id="678" type="above"/>
 <tile id="679" type="above"/>
 <tile id="680" type="above"/>
 <tile id="681" type="above"/>
 <tile id="682" type="above"/>
 <tile id="683" type="bridge"/>
 <tile id="684" type="bridge"/>
 <tile id="685" type="bridge"/>
 <tile id="686" type="bridge"/>
 <tile id="687" type="bridge"/>
 <tile id="688" type="bridge"/>
 <tile id="689" type="bridge"/>
 <tile id="690" type="bridge"/>
 <tile id="691" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="692" type="bridge"/>
 <tile id="693" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="694" type="bridge"/>
 <tile id="695" type="bridge"/>
 <tile id="696" type="bridge"/>
 <tile id="697" type="bridge"/>
 <tile id="698" type="bridge"/>
 <tile id="699" type="bridge"/>
 <tile id="700" type="bridge"/>
 <tile id="701" type="wood"/>
 <tile id="702" type="wood"/>
 <tile id="703" type="wood"/>
 <tile id="706">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="plant" x="31.9935" y="21.4375">
    <polygon points="0,0 -10.4779,-3.4375 -17.5926,1.125 -23.8017,10.8125 -26.7123,6.8125 -25.4834,-3.0625 -20.7618,-8.75 -19.2096,-10.3125 -21.6027,-17.5625 -29.4935,-13.5625 -29.4288,-17.1875 -27.4237,-21.5625 0.194036,-21.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="707">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="plant" x="24.9375" y="0.1875">
    <polygon points="0,0 0.9375,6.4375 -8.5,7.8125 -6.0625,13.125 -6,22.9375 -15.9375,19.5625 -17.125,26.4375 -19.875,31.75 -21.8125,28.4375 -24.9375,22.625 -25,-0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="708">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="bush" x="23.625" y="7.75">
    <polygon points="0,0 -3.5625,-0.125 -9.125,3.8125 -14.625,3.9375 -18.6875,8 -20.625,12.0625 -20.8125,13.875 -17.4375,19.375 -11.6875,24.1875 -2.875,24.125 2.125,21.75 5.3125,18.125 5.375,15.25 3.6875,14.8125 3.375,11.1875 2.4375,5.0625 1.375,1.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="709">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="710">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="711">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="712">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="713">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="714">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="715">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="716">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="717">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 4.21053,-2.10526 6.41148,1.81818 9.1866,3.63636 12.5359,7.17703 12.9904,12.0096 16.5072,13.9713 17.0335,16.555 15.311,19.1388 11.4833,19.6172 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -8.70813,22.6794 -12.0574,20.4785 -12.0574,17.4163 -10.1435,14.1627 -13.7799,11.866 -13.8756,8.32536 -11.2919,6.1244 -9.76077,3.0622 -8.51675,1.72249 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="718">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 1.62679,0.76555 7.94258,0.0956938 8.99522,5.83732 12.5359,7.17703 12.823,10.9091 11.9617,14.2584 11.9617,18.9474 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -7.46411,21.6268 -9.95215,19.6172 -11.5789,19.2344 -12.1531,18.1818 -12.3445,14.6411 -11.1962,10.4306 -9.85646,4.11483 -9.2823,3.54067 -6.88995,3.34928 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="719">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="flower" x="14.1627" y="6.60287">
    <polygon points="0,0 1.62679,0.76555 7.94258,0.0956938 8.99522,5.83732 12.5359,7.17703 12.823,10.9091 11.9617,14.2584 11.9617,18.9474 6.69856,24.4019 -3.0622,24.4019 -5.93301,23.5407 -7.46411,21.6268 -9.95215,19.6172 -11.5789,19.2344 -12.1531,18.1818 -12.3445,14.6411 -11.1962,10.4306 -9.85646,4.11483 -9.2823,3.54067 -6.88995,3.34928 -6.2201,0.191388"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="720">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75">
    <polygon points="0,0 32,0 32,17.75 25.0625,17.6875 19.8125,21.9375 15.9688,26.9688 8.35938,27.3594 8.21094,31.9922 0.0625,32.0625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="25" y="17.6875" width="7" height="14.25">
    <polygon points="0,0 7,0 7,14.25 -16.8125,14.3125 -16.7031,9.64063 -9.15625,9.28125 -5.0625,4.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="721">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="32" y="-0.0625" width="32" height="17.75">
    <polygon points="0,0 -32,0 -32,17.75 -25.0625,17.6875 -21,25.6875 -14.5313,24.4688 -8.35938,27.3594 -8.21094,31.9922 -0.0625,32.0625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="7" y="17.6875" width="7" height="14.25">
    <polygon points="0,0 -7,0 -7,14.25 16.8125,14.3125 16.7031,9.64063 10.3438,6.71875 3.9375,8.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="722">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="32" width="32" height="17.75">
    <polygon points="0,0 32,0 32,-17.75 19.375,-17.9375 13.5625,-23.1875 13.1563,-27.7813 8.23438,-31.9844 8.21094,-31.9922 0.0625,-32.0625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="25" y="14.25" width="7" height="14.25">
    <polygon points="-5.625,-0.3125 7,0 7,-14.25 -16.8125,-14.3125 -14.3281,-11.8281 -11.9688,-9.96875 -11.5,-5.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="723">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="32" y="32" width="32" height="17.75">
    <polygon points="0,0 -32,0 -32,-19 -25.625,-23.6875 -18.75,-21.1875 -15.0938,-23.5313 -14.9219,-26.9844 -8.21094,-31.9922 -0.0625,-32.0625"/>
   </object>
   <object id="2" name="Collision" type="cliff" x="7" y="14.25" width="7" height="14.25">
    <polygon points="-0.625,-5.9375 -7.0625,-1.25 -7,-14.25 16.8125,-14.3125 10.0156,-9.20313 9.90625,-5.65625 6.3125,-3.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="724">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="726">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="29.0222" y="0.0184659" width="2.97778" height="31.9815"/>
   <object id="2" name="Entrance" type="cave" x="2.04444" y="0" width="26.9456" height="31.9815"/>
   <object id="3" name="Collision" type="cliff" x="0.0224736" y="0.0156295" width="1.99341" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="727">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="27" y="-0.0909091" width="5" height="32.0909"/>
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="26.9901" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="728">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="31.9901" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="729">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="27" y="-0.0909091" width="5" height="32.0909"/>
   <object id="2" name="Entrance" type="cave" x="0" y="0" width="26.9901" height="31.9815"/>
  </objectgroup>
 </tile>
 <tile id="730">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cliff" type="climb" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="731">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Ladder" type="climb" x="6.9375" y="0" width="17.9375" height="29.5583"/>
   <object id="2" name="Collision" type="cliff" x="24.9375" y="0" width="7.125" height="27.894"/>
   <object id="3" name="Collision" type="cliff" x="0" y="0" width="6.9375" height="28.0279"/>
  </objectgroup>
 </tile>
 <tile id="732">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="cliff" x="0" y="0" width="14.875" height="29.0279"/>
   <object id="3" name="Ladder" type="climb" x="14.9375" y="0" width="17.125" height="29.1833"/>
  </objectgroup>
 </tile>
 <tile id="733">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="cliff" x="17.125" y="0" width="14.9375" height="27.8315"/>
   <object id="3" name="Ladder" type="climb" x="-0.0625" y="0" width="17.1875" height="29.1833"/>
  </objectgroup>
 </tile>
 <tile id="734" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="wood" x="11" y="1" width="10" height="31"/>
  </objectgroup>
 </tile>
 <tile id="735">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="15" width="3" height="17"/>
  </objectgroup>
 </tile>
 <tile id="736" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="14" y="14" width="18" height="18"/>
  </objectgroup>
 </tile>
 <tile id="737" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="14" width="32" height="18"/>
  </objectgroup>
 </tile>
 <tile id="738" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="14" width="17" height="18"/>
  </objectgroup>
 </tile>
 <tile id="739" type="above">
  <objectgroup draworder="index" id="3">
   <object id="2" name="Collision" type="waterfall" x="9.1875" y="0.0625">
    <polygon points="0,0 0.3125,8.75 6.1875,14.3125 13,17.125 22.625,17.1875 22.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="739" duration="200"/>
   <frame tileid="741" duration="200"/>
   <frame tileid="743" duration="200"/>
   <frame tileid="745" duration="200"/>
  </animation>
 </tile>
 <tile id="740" type="above"/>
 <tile id="741" type="above"/>
 <tile id="742" type="above"/>
 <tile id="743" type="above"/>
 <tile id="744" type="above"/>
 <tile id="745" type="above"/>
 <tile id="746" type="above"/>
 <tile id="748" type="bridge"/>
 <tile id="749" type="bridge"/>
 <tile id="750" type="bridge"/>
 <tile id="751" type="bridge"/>
 <tile id="752" type="bridge"/>
 <tile id="753" type="bridge"/>
 <tile id="754" type="bridge"/>
 <tile id="755" type="bridge"/>
 <tile id="756" type="bridge"/>
 <tile id="757" type="bridge"/>
 <tile id="758" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="31.997" height="20.6233">
    <polygon points="0.454545,17.4545 6.18108,10.0455 19.1803,5 31.9061,4 32.0089,8.07637 24.0956,8.11292 17.0468,10.1109 12.2128,13.0736 8.99929,16.1473 7.97331,20.9711 0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="759" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="32" height="8"/>
  </objectgroup>
 </tile>
 <tile id="760" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="32.0401" y="0" width="31.997" height="20.6233">
    <polygon points="-0.454545,17.4545 -6.18108,10.0455 -19.1803,5 -31.9061,4 -32.0089,8.07637 -24.0956,8.11292 -17.0468,10.1109 -12.2128,13.0736 -8.99929,16.1473 -7.97331,20.9711 -0.03125,21.0296"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="761" type="bridge"/>
 <tile id="762" type="bridge"/>
 <tile id="763" type="bridge"/>
 <tile id="764" type="bridge"/>
 <tile id="765" type="wood"/>
 <tile id="766" type="wood"/>
 <tile id="767" type="wood"/>
 <tile id="768">
  <animation>
   <frame tileid="768" duration="200"/>
   <frame tileid="769" duration="200"/>
  </animation>
 </tile>
 <tile id="770">
  <animation>
   <frame tileid="770" duration="200"/>
   <frame tileid="771" duration="200"/>
  </animation>
 </tile>
 <tile id="772">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="3" y="20.875">
    <polygon points="0,0 0,-4.8125 4.125,-9.9375 6.6875,-10 12.1875,-13.9375 13.6875,-14.0625 15.875,-12.9375 17.75,-10.9375 21.9375,-10 23.875,-8.0625 26.625,-6 28,-1.5 27.75,2.875 24.75,8.1875 17.8125,11.375 5.875,10 0.875,3.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="773">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="774">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="775">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="776">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="777">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="778">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="779">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="780">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="781">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="782">
  <objectgroup>
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="783">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="flower" x="8.9375" y="5.75">
    <polygon points="0,0 14.125,0 17.25,6.6875 15,20.25 2,20.125 -5.25,8.4375 -2,5.25 -0.125,5.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="784">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="22.0625" y="17.8125" width="9.9375" height="14.125"/>
   <object id="2" name="Collision" type="cliff" x="0.0625" y="0" width="21.9375" height="32">
    <polygon points="0,0 31.875,0.0625 31.875,17.8125 21.9375,17.8125 21.9375,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="785">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="14.1875" width="32" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="0" y="-0.0625" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="786">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0.0625" y="17.8125" width="9.9375" height="14.125"/>
   <object id="2" name="Collision" type="cliff" x="32" y="0" width="21.9375" height="32">
    <polygon points="0,0 -31.875,0.0625 -31.875,17.8125 -21.9375,17.8125 -21.9375,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="787" type="above"/>
 <tile id="788" type="above"/>
 <tile id="789" type="above"/>
 <tile id="790" type="above"/>
 <tile id="791" type="above"/>
 <tile id="792" type="above"/>
 <tile id="793" type="above"/>
 <tile id="794" type="above"/>
 <tile id="795" type="above"/>
 <tile id="796" type="above"/>
 <tile id="797" type="above"/>
 <tile id="798" type="above"/>
 <tile id="799">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="0" width="3" height="32"/>
  </objectgroup>
 </tile>
 <tile id="800" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="14" width="18" height="18"/>
  </objectgroup>
 </tile>
 <tile id="801" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="14" width="32" height="18"/>
  </objectgroup>
 </tile>
 <tile id="802" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="14" width="17" height="18"/>
  </objectgroup>
 </tile>
 <tile id="803" type="above"/>
 <tile id="804" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="8.875" y="15.9375" width="23.125" height="16"/>
  </objectgroup>
  <animation>
   <frame tileid="804" duration="200"/>
   <frame tileid="806" duration="200"/>
   <frame tileid="808" duration="200"/>
   <frame tileid="810" duration="200"/>
  </animation>
 </tile>
 <tile id="805" type="above">
  <animation>
   <frame tileid="805" duration="200"/>
   <frame tileid="807" duration="200"/>
   <frame tileid="809" duration="200"/>
   <frame tileid="811" duration="200"/>
  </animation>
 </tile>
 <tile id="806" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="15.9375" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="807" type="above"/>
 <tile id="808" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="15.9375" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="809" type="above"/>
 <tile id="810" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="15.9375" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="811" type="above"/>
 <tile id="812" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="813" type="bridge"/>
 <tile id="814" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="815" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="816" type="bridge"/>
 <tile id="817" type="bridge"/>
 <tile id="818" type="bridge"/>
 <tile id="819" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="820" type="bridge"/>
 <tile id="821" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="822" type="above"/>
 <tile id="823" type="above"/>
 <tile id="824" type="above"/>
 <tile id="825" type="bridge"/>
 <tile id="826" type="bridge"/>
 <tile id="827" type="bridge"/>
 <tile id="828" type="bridge"/>
 <tile id="829" type="wood"/>
 <tile id="830" type="wood"/>
 <tile id="831" type="wood"/>
 <tile id="832">
  <animation>
   <frame tileid="832" duration="200"/>
   <frame tileid="833" duration="200"/>
  </animation>
 </tile>
 <tile id="834">
  <animation>
   <frame tileid="834" duration="200"/>
   <frame tileid="835" duration="200"/>
  </animation>
 </tile>
 <tile id="848">
  <objectgroup>
   <object id="1" name="Collision" type="cliff" x="0.0625" y="0" width="21.9375" height="32"/>
   <object id="2" name="Vine" type="climb" x="22.0625" y="-0.0625" width="9.9375" height="32"/>
  </objectgroup>
 </tile>
 <tile id="849">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="850">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0.0625" y="-0.0625" width="9.9375" height="32"/>
   <object id="2" name="Collision" type="cliff" x="10.0625" y="0" width="21.9375" height="32"/>
  </objectgroup>
 </tile>
 <tile id="851">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.1875" y="-0.25">
    <polygon points="-0.125,0.25 -1.0625,7.0625 -2.1875,20.1875 -2.25,32.1875 29.75,32.25 29.8125,0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="852">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="25.8125" y="-0.125">
    <polygon points="0,0 2.875,11.875 4.1875,32.0625 -25.8125,32.1875 -25.8125,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="853">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="6.375" y="0">
    <polygon points="0,0 -0.5625,16.8125 8.25,24.0625 13.5,24.9375 18.3125,28 25.5625,30.0625 25.625,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="854">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="17.1875" y="-0.0625">
    <polygon points="0,0 0.75,1.125 0.75,8.8125 2.6875,9.875 2.75,19.75 -1.3125,22.625 -4.5,25.875 -7.375,28.1875 -11.3125,29.8125 -17.1875,29.9375 -17.1875,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="855">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="2.75" y="-0.0625">
    <polygon points="0,0 1.125,21.6875 5.375,24 16.125,24.25 19.5625,22.125 25.6875,22.75 29.1875,23.1875 29.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="856">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="27" y="-0.0625">
    <polygon points="0,0 0.0625,15 -3.3125,16.75 -5.1875,19.1875 -13.25,22 -19.125,24 -27.0625,24.0625 -27,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="857">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.1875" y="-0.25">
    <polygon points="-0.125,0.25 -1.0625,7.0625 -2.1875,20.1875 -2.25,32.1875 29.75,32.25 29.8125,0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="858">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="25.8125" y="-0.125">
    <polygon points="0,0 2.875,11.875 4.1875,32.0625 -25.8125,32.1875 -25.8125,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="859">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="6.375" y="0">
    <polygon points="0,0 -0.5625,16.8125 8.25,24.0625 13.5,24.9375 18.3125,28 25.5625,30.0625 25.625,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="860">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="17.1875" y="-0.0625">
    <polygon points="0,0 0.75,1.125 0.75,8.8125 2.6875,9.875 2.75,19.75 -1.3125,22.625 -4.5,25.875 -7.375,28.1875 -11.3125,29.8125 -17.1875,29.9375 -17.1875,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="861">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.75" y="-0.0625">
    <polygon points="0,0 1.125,21.6875 5.375,24 16.125,24.25 19.5625,22.125 25.6875,22.75 29.1875,23.1875 29.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="862">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="27" y="-0.0625">
    <polygon points="0,0 0.0625,15 -3.3125,16.75 -5.1875,19.1875 -13.25,22 -19.125,24 -27.0625,24.0625 -27,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="863" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="0" width="3" height="32"/>
  </objectgroup>
 </tile>
 <tile id="864">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="0" width="18" height="32">
    <polygon points="0,0 3,0 3.00694,14 17.9922,13.9922 18,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="865">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="0" width="32" height="32">
    <polygon points="13.9874,13.9773 13.9944,0 17.0035,-0.00208333 17.0042,13.9944 32.0111,13.9889 32,32 0,32 0,13.9922"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="866">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="17" y="0" width="18" height="32">
    <polygon points="0,0 -3,0 -3.00694,14 -17.0078,13.9922 -17,31.9844 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="868" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="10.125" y="-0.0625" width="21.8125" height="32"/>
  </objectgroup>
  <animation>
   <frame tileid="868" duration="200"/>
   <frame tileid="870" duration="200"/>
   <frame tileid="872" duration="200"/>
   <frame tileid="874" duration="200"/>
  </animation>
 </tile>
 <tile id="869" type="above">
  <animation>
   <frame tileid="869" duration="200"/>
   <frame tileid="871" duration="200"/>
   <frame tileid="873" duration="200"/>
   <frame tileid="875" duration="200"/>
  </animation>
 </tile>
 <tile id="870" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="10.125" y="-0.0625" width="21.8125" height="32"/>
  </objectgroup>
 </tile>
 <tile id="871" type="above"/>
 <tile id="872" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="10.125" y="-0.0625" width="21.8125" height="32"/>
  </objectgroup>
 </tile>
 <tile id="873" type="above"/>
 <tile id="874" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="10.125" y="-0.0625" width="21.8125" height="32"/>
  </objectgroup>
 </tile>
 <tile id="875" type="above"/>
 <tile id="876" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="877" type="bridge"/>
 <tile id="878" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="879" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="880" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="881" type="bridge"/>
 <tile id="882" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="883" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="884" type="bridge"/>
 <tile id="885" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="886" type="above"/>
 <tile id="887" type="above"/>
 <tile id="888" type="above"/>
 <tile id="889" type="bridge"/>
 <tile id="890" type="bridge"/>
 <tile id="891" type="bridge"/>
 <tile id="892" type="bridge"/>
 <tile id="893" type="wood"/>
 <tile id="894" type="wood"/>
 <tile id="895" type="wood"/>
 <tile id="896">
  <animation>
   <frame tileid="896" duration="200"/>
   <frame tileid="897" duration="200"/>
  </animation>
 </tile>
 <tile id="898">
  <animation>
   <frame tileid="898" duration="200"/>
   <frame tileid="899" duration="200"/>
  </animation>
 </tile>
 <tile id="912">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="22.0625" y="-0.0625" width="9.9375" height="15"/>
   <object id="2" name="Collision" type="cliff" x="0.0625" y="0" width="21.9375" height="32">
    <polygon points="0,0 21.9375,0 21.9375,14.9375 31.9375,14.9375 31.9375,32.0625 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="913">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Vine" type="climb" x="0" y="-0.0625" width="32" height="17.75"/>
   <object id="2" name="Collision" type="cliff" x="0" y="17.6875" width="32" height="14.25"/>
  </objectgroup>
 </tile>
 <tile id="914">
  <objectgroup>
   <object id="1" name="Vine" type="climb" x="0.0625" y="-0.0625" width="6.8125" height="11"/>
   <object id="2" name="Collision" type="cliff" x="6.875" y="0" width="25.125" height="32">
    <polygon points="0,0 25.125,0 25.1875,32 -6.9375,31.9375 -6.90625,11 0.0625,11"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="915">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="-0.125" y="21.6875">
    <polygon points="0,0 2.625,1.4375 3.75,2.125 7.5,3.3125 17.25,4.0625 32.0625,5.375 32.125,-21.75 0.125,-21.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="916">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="0.0625" y="26.25">
    <polygon points="0,0 5.625,-0.4375 10.25,-4 16.0625,-4.25 21.375,-7 24.9375,-7.4375 30.75,-11.25 30.8125,-20.125 29.6875,-26.3125 -0.0625,-26.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="917">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="32" y="1.875">
    <polygon points="0,0 -2.0625,0.0625 -26.1875,7.0625 -28.9375,10.0625 -31,13.8125 -32,17.9375 -31.9375,20.875 -27.875,24.8125 -20.625,25.9375 -13.9375,26.8125 -11.5625,28.125 -8.9375,28.0625 -0.0625,27.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="918">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="0.9375">
    <polygon points="0,0 13.9375,-0.0625 18.1875,1.9375 24.875,9 26.125,13.9375 26.125,20 16.1875,26 8.0625,29.125 0,29.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="919">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="0,0 0.1875,2 1.125,2.8125 8.875,3.0625 12.0625,7 14.4375,8.125 19.25,8.125 23.125,4.625 26.1875,-1 26.125,-7 18.625,-14.5 12.75,-16.0625 7.0625,-16.125 3.9375,-13.8125 2.0625,-11.9375 1,-9.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="920">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="3.0625,-0.875 5.3125,1.0625 8.875,3.0625 23.5625,3 25.125,1.8125 25.3125,-3 22.1875,-5.9375 18.25,-9.25 13.0625,-10.25 9.25,-10.3125 5.25,-6.9375 3,-3.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="921">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.125" y="21.6875">
    <polygon points="0,0 2.625,1.4375 3.75,2.125 7.5,3.3125 17.25,4.0625 32.0625,5.375 32.125,-21.75 0.125,-21.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="922">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="26.25">
    <polygon points="0,0 5.625,-0.4375 10.25,-4 16.0625,-4.25 21.375,-7 24.9375,-7.4375 30.75,-11.25 30.8125,-20.125 29.6875,-26.3125 -0.0625,-26.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="923">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="1.875">
    <polygon points="0,0 -2.0625,0.0625 -26.1875,7.0625 -28.9375,10.0625 -31,13.8125 -32,17.9375 -31.9375,20.875 -27.875,24.8125 -20.625,25.9375 -13.9375,26.8125 -11.5625,28.125 -8.9375,28.0625 -0.0625,27.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="924">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="0.9375">
    <polygon points="0,0 13.9375,-0.0625 18.1875,1.9375 24.875,9 26.125,13.9375 26.125,20 16.1875,26 8.0625,29.125 0,29.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="925">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="0,0 0.1875,2 1.125,2.8125 8.875,3.0625 12.0625,7 14.4375,8.125 19.25,8.125 23.125,4.625 26.1875,-1 26.125,-7 18.625,-14.5 12.75,-16.0625 7.0625,-16.125 3.9375,-13.8125 2.0625,-11.9375 1,-9.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="926">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="3.0625,-0.875 5.3125,1.0625 8.875,3.0625 23.5625,3 25.125,1.8125 25.3125,-3 22.1875,-5.9375 18.25,-9.25 13.0625,-10.25 9.25,-10.3125 5.25,-6.9375 3,-3.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="927">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="14" y="15" width="3" height="17"/>
  </objectgroup>
 </tile>
 <tile id="928">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="14" y="0" width="18" height="32">
    <polygon points="0,0 3,0 3.00694,14 17.9922,13.9922 18,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="929">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="0" width="32" height="32">
    <polygon points="13.9874,13.9773 13.9944,0 17.0035,-0.00208333 17.0042,13.9944 32.0111,13.9889 32,32 0,32 0,13.9922"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="930">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="17" y="0" width="18" height="32">
    <polygon points="0,0 -3,0 -3.00694,14 -17.0078,13.9922 -17,31.9844 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="931" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13.1818" y="10.9091" width="18.8182" height="21.0909"/>
  </objectgroup>
 </tile>
 <tile id="932" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="8.875" y="0.0625" width="23.125" height="16"/>
  </objectgroup>
  <animation>
   <frame tileid="932" duration="200"/>
   <frame tileid="934" duration="200"/>
   <frame tileid="936" duration="200"/>
   <frame tileid="938" duration="200"/>
  </animation>
 </tile>
 <tile id="933" type="above">
  <animation>
   <frame tileid="933" duration="200"/>
   <frame tileid="935" duration="200"/>
   <frame tileid="937" duration="200"/>
   <frame tileid="939" duration="200"/>
  </animation>
 </tile>
 <tile id="934" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="0.0625" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="935" type="above"/>
 <tile id="936" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="0.0625" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="937" type="above"/>
 <tile id="938" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="8.875" y="0.0625" width="23.125" height="16"/>
  </objectgroup>
 </tile>
 <tile id="939" type="above"/>
 <tile id="940" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="941" type="bridge"/>
 <tile id="942" type="bridge">
  <objectgroup draworder="index" id="2">
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
  </objectgroup>
 </tile>
 <tile id="943" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
   <object id="2" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="944" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="945" type="bridge"/>
 <tile id="946" type="bridge">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="947" type="bridge"/>
 <tile id="948" type="bridge"/>
 <tile id="949" type="bridge"/>
 <tile id="950" type="above"/>
 <tile id="951" type="above"/>
 <tile id="952" type="above"/>
 <tile id="953" type="bridge"/>
 <tile id="954" type="bridge"/>
 <tile id="955" type="bridge"/>
 <tile id="956" type="bridge"/>
 <tile id="957" type="wood"/>
 <tile id="958" type="wood"/>
 <tile id="959" type="wood"/>
 <tile id="960" type="grass">
  <animation>
   <frame tileid="960" duration="200"/>
   <frame tileid="961" duration="200"/>
   <frame tileid="962" duration="200"/>
  </animation>
 </tile>
 <tile id="963" type="grass">
  <animation>
   <frame tileid="963" duration="200"/>
   <frame tileid="964" duration="200"/>
   <frame tileid="965" duration="200"/>
  </animation>
 </tile>
 <tile id="966" type="grass">
  <animation>
   <frame tileid="966" duration="200"/>
   <frame tileid="967" duration="200"/>
   <frame tileid="968" duration="200"/>
  </animation>
 </tile>
 <tile id="972">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="mushroom" x="16.125" y="2.625">
    <polygon points="0,0 2.75,0.125 5.75,5.1875 6.0625,10.3125 3.3125,12.5625 2.9375,17.1875 -2.9375,17.375 -4.375,16.125 -4.25,12.375 -6.3125,11.0625 -6.25,6.1875 -5,3.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="973">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="16.125" y="2.625">
    <polygon points="0,0 2.75,0.125 5.75,5.1875 6.0625,10.3125 3.3125,12.5625 2.9375,17.1875 -2.9375,17.375 -4.375,16.125 -4.25,12.375 -6.3125,11.0625 -6.25,6.1875 -5,3.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="974">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="16.125" y="2.625">
    <polygon points="0,0 2.75,0.125 5.75,5.1875 6.0625,10.3125 3.3125,12.5625 2.9375,17.1875 -2.9375,17.375 -4.375,16.125 -4.25,12.375 -6.3125,11.0625 -6.25,6.1875 -5,3.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="975">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="14.25" y="-0.125">
    <polygon points="0,0 5.4375,0.0625 6.375,3.875 8.375,7.875 11.75,10.9375 11.875,16.0625 8.8125,19.1875 6.5,19.25 6.75,23.3125 2.3125,25.25 -3.375,24.1875 -4.625,22.6875 -4.9375,17.3125 -7.375,14.9375 -7.5625,10 -6.1875,7.8125 -0.6875,2.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="976">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="14.25" y="-0.125">
    <polygon points="0,0 5.4375,0.0625 6.375,3.875 8.375,7.875 11.75,10.9375 11.875,16.0625 8.8125,19.1875 6.5,19.25 6.75,23.3125 2.3125,25.25 -3.375,24.1875 -4.625,22.6875 -4.9375,17.3125 -7.375,14.9375 -7.5625,10 -6.1875,7.8125 -0.6875,2.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="977">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="14.25" y="-0.125">
    <polygon points="0,0 5.4375,0.0625 6.375,3.875 8.375,7.875 11.75,10.9375 11.875,16.0625 8.8125,19.1875 6.5,19.25 6.75,23.3125 2.3125,25.25 -3.375,24.1875 -4.625,22.6875 -4.9375,17.3125 -7.375,14.9375 -7.5625,10 -6.1875,7.8125 -0.6875,2.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="979">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="31.6875" y="1.6875">
    <polygon points="0.25,-0.0625 -13.625,1.125 -19.6875,3.3125 -23.6875,5.375 -28.75,10.1875 -30.8125,13.875 -31.75,19.125 -31.75,23.125 -29.6875,25.375 -27.1875,26.3125 -13.3125,27.25 -9.5,28.3125 0.3125,28.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="980">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="0.6875">
    <polygon points="0,0 14.125,0.125 17.9375,2.25 26.9375,11.4375 27.875,14.3125 27.9375,20.4375 24.375,22.625 20.75,25.3125 14,25.5 12.75,27.25 6.875,29.1875 -0.0625,29.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="981">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="2.8125">
    <polygon points="0,0 -2.1875,0 -7.25,2.0625 -10.9375,4.0625 -19,3.9375 -24.1875,4.9375 -28,7 -31.0625,10 -32.0625,12 -32.0625,21.0625 -27.875,25.125 -17.125,25.3125 -16,27.0625 -13,28.0625 -10.9375,29.25 -3.0625,29.1875 -0.0625,28.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="982">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="1.8125">
    <polygon points="0,0 3.1875,-2 10.125,-1.9375 15.8125,0.1875 20.125,4.3125 22.125,8.0625 23.0625,13.25 23.125,19.1875 20,24.125 14.1875,28.25 0,29.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="983">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="-1.9375,-13.875 -2.0625,0 1.125,2.8125 7.125,6.1875 18.6875,6.3125 27.3125,4.0625 30,0.125 30.125,-7.6875 27,-13.375 21,-17.1875 17.3125,-20.6875 12.875,-22.9375 5.25,-22.9375 0.25,-18.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="984">
  <objectgroup>
   <object id="1" x="14" y="11.6875">
    <polygon points="0,0 4.875,-0.0625 7.8125,0.8125 10,3.1875 10.3125,5.5 6,7.5 -2.1875,7.5 -3.5,6.25 -3.3125,3.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="985">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="31.6875" y="1.6875">
    <polygon points="0.25,-0.0625 -13.625,1.125 -19.6875,3.3125 -23.6875,5.375 -28.75,10.1875 -30.8125,13.875 -31.75,19.125 -31.75,23.125 -29.6875,25.375 -27.1875,26.3125 -13.3125,27.25 -9.5,28.3125 0.3125,28.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="986">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="0.6875">
    <polygon points="0,0 14.125,0.125 17.9375,2.25 26.9375,11.4375 27.875,14.3125 27.9375,20.4375 24.375,22.625 20.75,25.3125 14,25.5 12.75,27.25 6.875,29.1875 -0.0625,29.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="987">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="2.8125">
    <polygon points="0,0 -2.1875,0 -7.25,2.0625 -10.9375,4.0625 -19,3.9375 -24.1875,4.9375 -28,7 -31.0625,10 -32.0625,12 -32.0625,21.0625 -27.875,25.125 -17.125,25.3125 -16,27.0625 -13,28.0625 -10.9375,29.25 -3.0625,29.1875 -0.0625,28.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="988">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="1.8125">
    <polygon points="0,0 3.1875,-2 10.125,-1.9375 15.8125,0.1875 20.125,4.3125 22.125,8.0625 23.0625,13.25 23.125,19.1875 20,24.125 14.1875,28.25 0,29.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="989">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="-1.9375,-13.875 -2.0625,0 1.125,2.8125 7.125,6.1875 18.6875,6.3125 27.3125,4.0625 30,0.125 30.125,-7.6875 27,-13.375 21,-17.1875 17.3125,-20.6875 12.875,-22.9375 5.25,-22.9375 0.25,-18.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="990">
  <objectgroup>
   <object id="1" x="14" y="11.6875">
    <polygon points="0,0 4.875,-0.0625 7.8125,0.8125 10,3.1875 10.3125,5.5 6,7.5 -2.1875,7.5 -3.5,6.25 -3.3125,3.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="991">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13" y="10.875" width="6" height="21.125"/>
  </objectgroup>
 </tile>
 <tile id="992" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13.1818" y="10.9091" width="18.8182" height="21.0909"/>
  </objectgroup>
 </tile>
 <tile id="993" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="11" width="32" height="21"/>
  </objectgroup>
 </tile>
 <tile id="994" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="11" width="19" height="21"/>
  </objectgroup>
 </tile>
 <tile id="995">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13" y="0" width="19" height="19"/>
  </objectgroup>
 </tile>
 <tile id="996" type="above"/>
 <tile id="997" type="above">
  <animation>
   <frame tileid="997" duration="200"/>
   <frame tileid="999" duration="200"/>
   <frame tileid="1001" duration="200"/>
   <frame tileid="1003" duration="200"/>
  </animation>
 </tile>
 <tile id="998" type="above"/>
 <tile id="999" type="above"/>
 <tile id="1000" type="above"/>
 <tile id="1001" type="above"/>
 <tile id="1002" type="above"/>
 <tile id="1003" type="above"/>
 <tile id="1004" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1005" type="bridge"/>
 <tile id="1006" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1007" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1008" type="above"/>
 <tile id="1009" type="above"/>
 <tile id="1010" type="above"/>
 <tile id="1011">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="24.9375" y="0.4375">
    <polygon points="0,0 -12.75,2.6875 -18.875,5.75 -22.9375,9.625 -24.875,13.5 -24.875,-0.4375 0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1013">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="7.1875" y="0.4375">
    <polygon points="0,0 12.75,2.6875 18.875,5.75 22.9375,9.625 24.875,13.5 24.875,-0.4375 -0.125,-0.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1014" type="above"/>
 <tile id="1015" type="above"/>
 <tile id="1016" type="above"/>
 <tile id="1017" type="tile"/>
 <tile id="1018" type="tile"/>
 <tile id="1019" type="tile"/>
 <tile id="1020" type="tile"/>
 <tile id="1021" type="tile"/>
 <tile id="1022" type="tile"/>
 <tile id="1023" type="tile"/>
 <tile id="1024" type="grass">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="7.8125" y="9.0625" width="16.125" height="9.625"/>
   <object id="2" name="Above" type="above" x="6.625" y="0" width="20" height="9"/>
  </objectgroup>
  <animation>
   <frame tileid="1024" duration="200"/>
   <frame tileid="1025" duration="200"/>
   <frame tileid="1026" duration="200"/>
  </animation>
 </tile>
 <tile id="1027" type="grass">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="7.5" y="0" width="16" height="10.8125"/>
  </objectgroup>
  <animation>
   <frame tileid="1027" duration="200"/>
   <frame tileid="1028" duration="200"/>
   <frame tileid="1029" duration="200"/>
  </animation>
 </tile>
 <tile id="1030" type="grass">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Bush" type="bush" x="6.5" y="8.0625" width="16.875" height="11.5625"/>
   <object id="2" name="Above" type="above" x="3.25" y="0.1875" width="24.75" height="7.6875"/>
  </objectgroup>
  <animation>
   <frame tileid="1030" duration="200"/>
   <frame tileid="1031" duration="200"/>
   <frame tileid="1032" duration="200"/>
  </animation>
 </tile>
 <tile id="1036">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="mushroom" x="13.125" y="2.75">
    <polygon points="0,0 4.875,0.0625 9,5.375 10.0625,11.25 6.8125,14.4375 7,18.1875 4.9375,19.25 -0.125,19.3125 -2.25,18.125 -2.3125,14.125 -5.3125,11.125 -5.5,5.6875 -4.25,4.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1037">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="13.125" y="2.75">
    <polygon points="0,0 4.875,0.0625 9,5.375 10.0625,11.25 6.8125,14.4375 7,18.1875 4.9375,19.25 -0.125,19.3125 -2.25,18.125 -2.3125,14.125 -5.3125,11.125 -5.5,5.6875 -4.25,4.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1038">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="13.125" y="2.75">
    <polygon points="0,0 4.875,0.0625 9,5.375 10.0625,11.25 6.8125,14.4375 7,18.1875 4.9375,19.25 -0.125,19.3125 -2.25,18.125 -2.3125,14.125 -5.3125,11.125 -5.5,5.6875 -4.25,4.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1039">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="20.625" y="19.5">
    <polygon points="0,0 -1.75,1.75 -8.8125,1.625 -10.9375,-0.625 -10.875,-6.4375 -13.75,-7.5 -15.8125,-10.75 -15.8125,-13.6875 -13.75,-16.5625 -11.625,-17.75 -8.625,-18.5625 -1.3125,-18.6875 1.375,-17.5 3.125,-16.5625 4.6875,-15.625 5.4375,-13.625 5.4375,-10.875 3.25,-7.625 1.1875,-6.4375 -1.75,-5.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1040">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="20.625" y="19.5">
    <polygon points="0,0 -1.75,1.75 -8.8125,1.625 -10.9375,-0.625 -10.875,-6.4375 -13.75,-7.5 -15.8125,-10.75 -15.8125,-13.6875 -13.75,-16.5625 -11.625,-17.75 -8.625,-18.5625 -1.3125,-18.6875 1.375,-17.5 3.125,-16.5625 4.6875,-15.625 5.4375,-13.625 5.4375,-10.875 3.25,-7.625 1.1875,-6.4375 -1.75,-5.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1041">
  <objectgroup>
   <object id="1" name="Collision" type="mushroom" x="20.625" y="19.5">
    <polygon points="0,0 -1.75,1.75 -8.8125,1.625 -10.9375,-0.625 -10.875,-6.4375 -13.75,-7.5 -15.8125,-10.75 -15.8125,-13.6875 -13.75,-16.5625 -11.625,-17.75 -8.625,-18.5625 -1.3125,-18.6875 1.375,-17.5 3.125,-16.5625 4.6875,-15.625 5.4375,-13.625 5.4375,-10.875 3.25,-7.625 1.1875,-6.4375 -1.75,-5.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1043" type="above"/>
 <tile id="1044" type="above"/>
 <tile id="1045" type="above"/>
 <tile id="1046" type="above"/>
 <tile id="1047" type="above"/>
 <tile id="1048" type="above"/>
 <tile id="1049" type="above"/>
 <tile id="1050" type="above"/>
 <tile id="1051" type="above"/>
 <tile id="1052" type="above"/>
 <tile id="1053" type="above"/>
 <tile id="1054" type="above"/>
 <tile id="1055">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13" y="0" width="6" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1056">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13.0556" y="32" width="20.0505" height="32">
    <polygon points="-0.0546875,0 5.91988,0 5.97449,-12.9688 18.9114,-12.9778 18.9366,-31.9844 -0.0390625,-32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1057">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="31.9823" width="32" height="32">
    <polygon points="12.9305,-12.994 13,0 19.0158,0.0177083 18.9964,-12.9788 32.0134,-12.971 32,-32 0,-32 0.00225694,-12.9844"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1058">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="18.9375" y="32" width="20.0505" height="32">
    <polygon points="0.0546875,0 -5.91988,0 -5.97449,-12.9688 -18.9114,-12.9778 -18.9366,-31.9844 0.0390625,-32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1059" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="11" width="32" height="21"/>
  </objectgroup>
 </tile>
 <tile id="1060" type="above"/>
 <tile id="1061" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="23" y="31.875">
    <polygon points="0,0 -0.3125,-8.75 -6.1875,-14.3125 -13,-17.125 -22.875,-17.1875 -22.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1061" duration="200"/>
   <frame tileid="1063" duration="200"/>
   <frame tileid="1065" duration="200"/>
   <frame tileid="1067" duration="200"/>
  </animation>
 </tile>
 <tile id="1062" type="above"/>
 <tile id="1063" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="23" y="31.875">
    <polygon points="0,0 -0.3125,-8.75 -6.1875,-14.3125 -13,-17.125 -22.875,-17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1064" type="above"/>
 <tile id="1065" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="23" y="31.875">
    <polygon points="0,0 -0.3125,-8.75 -6.1875,-14.3125 -13,-17.125 -22.875,-17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1066" type="above"/>
 <tile id="1067" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="23" y="31.875">
    <polygon points="0,0 -0.3125,-8.75 -6.1875,-14.3125 -13,-17.125 -22.875,-17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1068" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1069" type="bridge"/>
 <tile id="1070" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1071" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1072" type="above"/>
 <tile id="1073" type="above"/>
 <tile id="1074" type="above"/>
 <tile id="1075">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="0" y="0" width="24" height="13">
    <polygon points="0,0 24,0 24.0089,1.01337 20.0892,1.01671 17.1695,2.02005 13.4552,4.33924 9.16042,8.24097 8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1077">
  <objectgroup>
   <object id="1" name="Bridge" type="wood" x="32.0089" y="0" width="24" height="13">
    <polygon points="0,0 -24,0 -24.0089,1.01337 -20.0892,1.01671 -17.1695,2.02005 -13.4552,4.33924 -9.16042,8.24097 -8.06667,13.0222 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1078" type="above"/>
 <tile id="1079" type="above"/>
 <tile id="1080" type="above"/>
 <tile id="1081" type="tile"/>
 <tile id="1082" type="tile"/>
 <tile id="1083" type="tile"/>
 <tile id="1084" type="tile"/>
 <tile id="1085" type="tile"/>
 <tile id="1086" type="tile"/>
 <tile id="1087" type="tile"/>
 <tile id="1088">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.0625,1.625 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13.0625,23.25 -16.2813,23.2813 -15.8125,17.875 -15.875,14.4375 -13.3125,11.625 -11.125,7 -6.8125,5.625 -3.125,2.75 -2.75,1.4375"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.25 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13,23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1088" duration="200"/>
   <frame tileid="1091" duration="200"/>
  </animation>
 </tile>
 <tile id="1089">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1089" duration="200"/>
   <frame tileid="1092" duration="200"/>
  </animation>
 </tile>
 <tile id="1090">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,2.6875 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 17.5938,23.1563 16.625,17.5 16.75,11.375 12.875,10.5 11.125,7 7.125,5.25 4.75,2.5625"/>
   </object>
   <object id="2" name="Water" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1090" duration="200"/>
   <frame tileid="1093" duration="200"/>
  </animation>
 </tile>
 <tile id="1091">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.0625,1.625 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13.0625,23.25 -16.2813,23.2813 -15.8125,17.875 -15.875,14.4375 -13.3125,11.625 -11.125,7 -6.8125,5.625 -3.125,2.75 -2.75,1.4375"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.25 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13,23.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1092">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="1093">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,2.6875 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 17.5938,23.1563 16.625,17.5 16.75,11.375 12.875,10.5 11.125,7 7.125,5.25 4.75,2.5625"/>
   </object>
   <object id="2" name="Water" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1094">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0,0 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25 -19.6875,23.1875 -19.0625,20.625 -15.8125,17.875 -15.4375,14.875 -12.4375,12.75 -11.125,7 -6.3125,6.75 -3.125,2.75 -1.4375,0.1875"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1094" duration="200"/>
   <frame tileid="1097" duration="200"/>
  </animation>
 </tile>
 <tile id="1095">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1095" duration="200"/>
   <frame tileid="1098" duration="200"/>
  </animation>
 </tile>
 <tile id="1096">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,1.375 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 21.3438,23.1563 18.0625,17.25 16.75,11.375 12.875,10.5 11.0625,8.625 10.8125,4 4.75,2.5625"/>
   </object>
   <object id="2" name="Water" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1096" duration="200"/>
   <frame tileid="1099" duration="200"/>
  </animation>
 </tile>
 <tile id="1097">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0,0 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25 -19.6875,23.1875 -19.0625,20.625 -15.8125,17.875 -15.4375,14.875 -12.4375,12.75 -11.125,7 -6.3125,6.75 -3.125,2.75 -1.4375,0.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1098">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="1099">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,1.375 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 21.3438,23.1563 18.0625,17.25 16.75,11.375 12.875,10.5 11.0625,8.625 10.8125,4 4.75,2.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1107">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="2.1875" y="-0.25">
    <polygon points="-0.125,0.25 -1.0625,7.0625 -2.1875,20.1875 -2.25,32.1875 29.75,32.25 29.8125,0.3125"/>
   </object>
   <object id="2" name="Collision" type="boulder" x="2.1875" y="-0.25">
    <polygon points="-0.125,0.25 -1.0625,7.0625 -2.1875,20.1875 -2.25,32.1875 29.75,32.25 29.8125,0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1108">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="25.8125" y="-0.125">
    <polygon points="0,0 2.875,11.875 4.1875,32.0625 -25.8125,32.1875 -25.8125,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1109">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="6.375" y="0">
    <polygon points="0,0 -0.5625,16.8125 8.25,24.0625 13.5,24.9375 18.3125,28 25.5625,30.0625 25.625,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1110">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="17.1875" y="-0.0625">
    <polygon points="0,0 0.75,1.125 0.75,8.8125 2.6875,9.875 2.75,19.75 -1.3125,22.625 -4.5,25.875 -7.375,28.1875 -11.3125,29.8125 -17.1875,29.9375 -17.1875,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1111">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.75" y="-0.0625">
    <polygon points="0,0 1.125,21.6875 5.375,24 16.125,24.25 19.5625,22.125 25.6875,22.75 29.1875,23.1875 29.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1112">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="27" y="-0.0625">
    <polygon points="0,0 0.0625,15 -3.3125,16.75 -5.1875,19.1875 -13.25,22 -19.125,24 -27.0625,24.0625 -27,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1113">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.1875" y="-0.25">
    <polygon points="-0.125,0.25 -1.0625,7.0625 -2.1875,20.1875 -2.25,32.1875 29.75,32.25 29.8125,0.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1114">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="25.8125" y="-0.125">
    <polygon points="0,0 2.875,11.875 4.1875,32.0625 -25.8125,32.1875 -25.8125,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1115">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="6.375" y="0">
    <polygon points="0,0 -0.5625,16.8125 8.25,24.0625 13.5,24.9375 18.3125,28 25.5625,30.0625 25.625,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1116">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="17.1875" y="-0.0625">
    <polygon points="0,0 0.75,1.125 0.75,8.8125 2.6875,9.875 2.75,19.75 -1.3125,22.625 -4.5,25.875 -7.375,28.1875 -11.3125,29.8125 -17.1875,29.9375 -17.1875,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1117">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="2.75" y="-0.0625">
    <polygon points="0,0 1.125,21.6875 5.375,24 16.125,24.25 19.5625,22.125 25.6875,22.75 29.1875,23.1875 29.1875,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1118">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="27" y="-0.0625">
    <polygon points="0,0 0.0625,15 -3.3125,16.75 -5.1875,19.1875 -13.25,22 -19.125,24 -27.0625,24.0625 -27,-0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1119" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13" y="10.875" width="6" height="21.125"/>
  </objectgroup>
 </tile>
 <tile id="1120">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13.0556" y="0" width="20.0505" height="32">
    <polygon points="-0.0546875,0 5.91988,0 5.97449,10.9688 18.9336,11 18.9366,31.9844 -0.0390625,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1121">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="0" width="32" height="32">
    <polygon points="12.993,10.994 13,0 19.0158,-0.0177083 19.0042,10.9944 32.0056,10.9944 32,32 0,32 -0.00555556,10.9922"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1122">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="18.9375" y="0" width="20.0505" height="32">
    <polygon points="0.0546875,0 -5.91988,0 -5.97449,10.9688 -18.9336,11 -18.9366,31.9844 0.0390625,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1123">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="0" width="32" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1124" type="above"/>
 <tile id="1125" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="waterfall" x="0.0909091" y="0.0625" width="24.25" height="32"/>
  </objectgroup>
  <animation>
   <frame tileid="1125" duration="200"/>
   <frame tileid="1127" duration="200"/>
   <frame tileid="1129" duration="200"/>
   <frame tileid="1131" duration="200"/>
  </animation>
 </tile>
 <tile id="1126" type="above"/>
 <tile id="1127" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0909091" y="0.0625" width="24.25" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1128" type="above"/>
 <tile id="1129" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0909091" y="0.0625" width="24.25" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1130" type="above"/>
 <tile id="1131" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="0.0909091" y="0.0625" width="24.25" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1132" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1133" type="bridge"/>
 <tile id="1134" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1135" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
   <object id="2" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1139" type="above"/>
 <tile id="1140" type="above"/>
 <tile id="1141" type="above"/>
 <tile id="1142" type="above"/>
 <tile id="1143" type="above"/>
 <tile id="1144" type="above"/>
 <tile id="1145" type="tile"/>
 <tile id="1146" type="tile"/>
 <tile id="1147" type="tile"/>
 <tile id="1148" type="tile"/>
 <tile id="1149" type="tile"/>
 <tile id="1150" type="tile"/>
 <tile id="1151" type="tile"/>
 <tile id="1152">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1152" duration="200"/>
   <frame tileid="1155" duration="200"/>
  </animation>
 </tile>
 <tile id="1153">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1154">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1154" duration="200"/>
   <frame tileid="1157" duration="200"/>
  </animation>
 </tile>
 <tile id="1155">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1157">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1158">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1158" duration="200"/>
   <frame tileid="1161" duration="200"/>
  </animation>
 </tile>
 <tile id="1160">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1160" duration="200"/>
   <frame tileid="1163" duration="200"/>
  </animation>
 </tile>
 <tile id="1161">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1163">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
   <object id="2" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1164">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1164" duration="200"/>
   <frame tileid="1166" duration="200"/>
  </animation>
 </tile>
 <tile id="1165">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1165" duration="200"/>
   <frame tileid="1167" duration="200"/>
  </animation>
 </tile>
 <tile id="1166">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1167">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1168">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="25.125" y="24.3125" width="6.9375" height="7.6875"/>
   <object id="2" name="Water" type="water" x="0.0625" y="0.0625" width="31.8125" height="24.1875">
    <polygon points="0,0 31.8125,0 31.8125,24.1875 25.0469,24.1875 24.9688,32 0,32.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1168" duration="200"/>
   <frame tileid="1360" duration="200"/>
  </animation>
 </tile>
 <tile id="1169">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0625" y="0" width="32" height="26.0625"/>
   <object id="2" name="Water" type="water" x="0" y="26.0625" width="32.125" height="6"/>
  </objectgroup>
  <animation>
   <frame tileid="1169" duration="200"/>
   <frame tileid="1361" duration="200"/>
  </animation>
 </tile>
 <tile id="1170">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0625" y="24.3125" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="32.0625" y="0.0625" width="31.8125" height="24.1875">
    <polygon points="0,0 -31.8125,0 -31.8125,24.1875 -25.0469,24.1875 -24.9688,32 0,32.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1170" duration="200"/>
   <frame tileid="1362" duration="200"/>
  </animation>
 </tile>
 <tile id="1171">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.125" y="21.6875">
    <polygon points="0,0 2.625,1.4375 3.75,2.125 7.5,3.3125 17.25,4.0625 32.0625,5.375 32.125,-21.75 0.125,-21.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1172">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="26.25">
    <polygon points="0,0 5.625,-0.4375 10.25,-4 16.0625,-4.25 21.375,-7 24.9375,-7.4375 30.75,-11.25 30.8125,-20.125 29.6875,-26.3125 -0.0625,-26.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1173">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="1.875">
    <polygon points="0,0 -2.0625,0.0625 -26.1875,7.0625 -28.9375,10.0625 -31,13.8125 -32,17.9375 -31.9375,20.875 -27.875,24.8125 -20.625,25.9375 -13.9375,26.8125 -11.5625,28.125 -8.9375,28.0625 -0.0625,27.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1174">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="0.9375">
    <polygon points="0,0 13.9375,-0.0625 18.1875,1.9375 24.875,9 26.125,13.9375 26.125,20 16.1875,26 8.0625,29.125 0,29.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1175">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="0,0 0.1875,2 1.125,2.8125 8.875,3.0625 12.0625,7 14.4375,8.125 19.25,8.125 23.125,4.625 26.1875,-1 26.125,-7 18.625,-14.5 12.75,-16.0625 7.0625,-16.125 3.9375,-13.8125 2.0625,-11.9375 1,-9.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1176">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="3.0625,-0.875 5.3125,1.0625 8.875,3.0625 23.5625,3 25.125,1.8125 25.3125,-3 22.1875,-5.9375 18.25,-9.25 13.0625,-10.25 9.25,-10.3125 5.25,-6.9375 3,-3.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1177">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.125" y="21.6875">
    <polygon points="0,0 2.625,1.4375 3.75,2.125 7.5,3.3125 17.25,4.0625 32.0625,5.375 32.125,-21.75 0.125,-21.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1178">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="26.25">
    <polygon points="0,0 5.625,-0.4375 10.25,-4 16.0625,-4.25 21.375,-7 24.9375,-7.4375 30.75,-11.25 30.8125,-20.125 29.6875,-26.3125 -0.0625,-26.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1179">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="1.875">
    <polygon points="0,0 -2.0625,0.0625 -26.1875,7.0625 -28.9375,10.0625 -31,13.8125 -32,17.9375 -31.9375,20.875 -27.875,24.8125 -20.625,25.9375 -13.9375,26.8125 -11.5625,28.125 -8.9375,28.0625 -0.0625,27.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1180">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="0.9375">
    <polygon points="0,0 13.9375,-0.0625 18.1875,1.9375 24.875,9 26.125,13.9375 26.125,20 16.1875,26 8.0625,29.125 0,29.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1181">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="0,0 0.1875,2 1.125,2.8125 8.875,3.0625 12.0625,7 14.4375,8.125 19.25,8.125 23.125,4.625 26.1875,-1 26.125,-7 18.625,-14.5 12.75,-16.0625 7.0625,-16.125 3.9375,-13.8125 2.0625,-11.9375 1,-9.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1182">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="3.0625,-0.875 5.3125,1.0625 8.875,3.0625 23.5625,3 25.125,1.8125 25.3125,-3 22.1875,-5.9375 18.25,-9.25 13.0625,-10.25 9.25,-10.3125 5.25,-6.9375 3,-3.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1183">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13" y="0" width="6" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1184">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13.0556" y="32" width="20.0505" height="32">
    <polygon points="-0.0546875,0 5.91988,0 5.97449,-12.9688 18.9114,-12.9778 18.9366,-31.9844 -0.0390625,-32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1185">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="31.9823" width="32" height="32">
    <polygon points="12.9305,-12.994 13,0 19.0158,0.0177083 18.9964,-12.9788 32.0134,-12.971 32,-32 0,-32 0.00225694,-12.9844"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1186">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="18.9375" y="32" width="20.0505" height="32">
    <polygon points="0.0546875,0 -5.91988,0 -5.97449,-12.9688 -18.9114,-12.9778 -18.9366,-31.9844 0.0390625,-32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1187" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="11" width="19" height="21"/>
  </objectgroup>
 </tile>
 <tile id="1188" type="above"/>
 <tile id="1189" type="above">
  <objectgroup draworder="index" id="3">
   <object id="1" name="Collision" type="waterfall" x="22.875" y="0">
    <polygon points="0,0 -0.3125,8.75 -6.1875,14.3125 -13,17.125 -22.625,17.1875 -22.875,0"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1189" duration="200"/>
   <frame tileid="1191" duration="200"/>
   <frame tileid="1193" duration="200"/>
   <frame tileid="1195" duration="200"/>
  </animation>
 </tile>
 <tile id="1190" type="above"/>
 <tile id="1191" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.875" y="0">
    <polygon points="0,0 -0.3125,8.75 -6.1875,14.3125 -13,17.125 -22.625,17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1192" type="above"/>
 <tile id="1193" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.875" y="0">
    <polygon points="0,0 -0.3125,8.75 -6.1875,14.3125 -13,17.125 -22.625,17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1194" type="above"/>
 <tile id="1195" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="waterfall" x="22.875" y="0">
    <polygon points="0,0 -0.3125,8.75 -6.1875,14.3125 -13,17.125 -22.625,17.1875 -22.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1196" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1197" type="bridge"/>
 <tile id="1198" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1199" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1203" type="above"/>
 <tile id="1204" type="above"/>
 <tile id="1205" type="above"/>
 <tile id="1206" type="above"/>
 <tile id="1207" type="above"/>
 <tile id="1208" type="above"/>
 <tile id="1209" type="tile"/>
 <tile id="1210" type="tile"/>
 <tile id="1211" type="tile"/>
 <tile id="1212" type="tile"/>
 <tile id="1213" type="tile"/>
 <tile id="1214" type="tile"/>
 <tile id="1215" type="tile"/>
 <tile id="1216">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.875" y="23.4063">
    <polygon points="0.0625,-7.0625 0.1875,-9.75 -5.1875,-10.3125 -9,-16.1875 -11.875,-17.9375 -13.875,-20.3125 -13.9375,-23.375 -16.2813,-23.2813 -15.8125,-17.875 -13.3125,-14.5 -10.5,-12.6875 -7.875,-9.9375 -4.8125,-7.3125"/>
   </object>
   <object id="2" name="Water" type="water" x="31.875" y="23.4063">
    <polygon points="0,-23.3125 0.0625,-9.6875 -5.1875,-10.1563 -7.3125,-12.9375 -9.125,-16.25 -11.9375,-18 -13.8125,-20.4375 -13.875,-23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1216" duration="200"/>
   <frame tileid="1219" duration="200"/>
  </animation>
 </tile>
 <tile id="1217">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="1217" duration="200"/>
   <frame tileid="1220" duration="200"/>
  </animation>
 </tile>
 <tile id="1218">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.09375" y="23.2188">
    <polygon points="0,-23.25 0.125,-7.9375 6.1875,-10.1875 10,-14.125 10.1875,-16.3125 13.0625,-17.5625 13,-23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="-0.09375" y="23.2188">
    <polygon points="0.125,-6.125 0.0625,-7.9375 6.1875,-10.1875 9.8125,-14 10,-16.1875 12.9375,-17.5 13.0625,-23.25 16.2813,-23.2813 16,-17.875 14.5625,-14.75 11.8125,-11.625 9.25,-9.9375 6.8125,-6.875 3.8125,-5.9375"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1218" duration="200"/>
   <frame tileid="1221" duration="200"/>
  </animation>
 </tile>
 <tile id="1219">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.875" y="23.4063">
    <polygon points="0,-23.3125 0.0625,-9.6875 -5.1875,-10.1563 -7.3125,-12.9375 -9.125,-16.25 -11.9375,-18 -13.8125,-20.4375 -13.875,-23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="31.875" y="23.4063">
    <polygon points="0.0625,-7.0625 0.1875,-9.75 -5.1875,-10.3125 -9,-16.1875 -11.875,-17.9375 -13.875,-20.3125 -13.9375,-23.375 -16.2813,-23.2813 -15.8125,-17.875 -13.3125,-14.5 -10.5,-12.6875 -7.875,-9.9375 -4.8125,-7.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1220">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="1221">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.09375" y="23.2188">
    <polygon points="0,-23.25 0.125,-7.9375 6.1875,-10.1875 10,-14.125 10.1875,-16.3125 13.0625,-17.5625 13,-23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="-0.09375" y="23.2188">
    <polygon points="0.125,-6.125 0.0625,-7.9375 6.1875,-10.1875 9.8125,-14 10,-16.1875 12.9375,-17.5 13.0625,-23.25 16.2813,-23.2813 16,-17.875 14.5625,-14.75 11.8125,-11.625 9.25,-9.9375 6.8125,-6.875 3.8125,-5.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1222">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="23.25">
    <polygon points="0,-4.5625 0.0625,-7.375 -6.125,-9.1875 -9.125,-15.25 -12.875,-17.375 -14.625,-19.75 -15.6875,-23.125 -19.4688,-23.1563 -17.5,-19 -15.375,-16.625 -13.3125,-14 -10.375,-11.5 -8.1875,-8.1875 -3.9375,-5.375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="23.25">
    <polygon points="0,-23.25 0.0625,-7.375 -6,-9.1875 -9.125,-15.125 -12.8125,-17.3125 -14.5625,-19.625 -15.6875,-23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1222" duration="200"/>
   <frame tileid="1225" duration="200"/>
  </animation>
 </tile>
 <tile id="1223">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="1223" duration="200"/>
   <frame tileid="1226" duration="200"/>
  </animation>
 </tile>
 <tile id="1224">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.09375" y="23.1875">
    <polygon points="0,-5.1875 -0.0625,-7.375 6.125,-9.1875 11.6875,-12.4375 12.625,-18.875 14.6875,-20.375 15.6875,-23.125 21.3438,-23.1563 17.375,-17.625 15.125,-14.9375 13.75,-11.0625 9.9375,-9.125 8.4375,-5.375 3.5,-4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="0.09375" y="23.1875">
    <polygon points="0,-23.25 -0.0625,-7.375 6,-9.1875 11.6875,-12.3125 12.75,-18.9375 14.5625,-20.3125 15.6875,-23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1224" duration="200"/>
   <frame tileid="1227" duration="200"/>
  </animation>
 </tile>
 <tile id="1225">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="23.25">
    <polygon points="0,-4.5625 0.0625,-7.375 -6.125,-9.1875 -9.125,-15.25 -12.875,-17.375 -14.625,-19.75 -15.6875,-23.125 -19.4688,-23.1563 -17.5,-19 -15.375,-16.625 -13.3125,-14 -10.375,-11.5 -8.1875,-8.1875 -3.9375,-5.375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="23.25">
    <polygon points="0,-23.25 0.0625,-7.375 -6,-9.1875 -9.125,-15.125 -12.8125,-17.3125 -14.5625,-19.625 -15.6875,-23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1226">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="1227">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.09375" y="23.1875">
    <polygon points="0,-5.1875 -0.0625,-7.375 6.125,-9.1875 11.6875,-12.4375 12.625,-18.875 14.6875,-20.375 15.6875,-23.125 21.3438,-23.1563 17.375,-17.625 15.125,-14.9375 13.75,-11.0625 9.9375,-9.125 8.4375,-5.375 3.5,-4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="0.09375" y="23.1875">
    <polygon points="0,-23.25 -0.0625,-7.375 6,-9.1875 11.6875,-12.3125 12.75,-18.9375 14.5625,-20.3125 15.6875,-23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1228">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1228" duration="200"/>
   <frame tileid="1230" duration="200"/>
  </animation>
 </tile>
 <tile id="1229">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1229" duration="200"/>
   <frame tileid="1231" duration="200"/>
  </animation>
 </tile>
 <tile id="1230">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1231">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1232">
  <objectgroup>
   <object id="1" name="Water" type="water" x="25.0625" y="0.0625" width="7" height="31.9375"/>
   <object id="2" name="Melted Ice" type="water" x="0.0625" y="0.0625" width="25.0625" height="31.875"/>
  </objectgroup>
  <animation>
   <frame tileid="1232" duration="200"/>
   <frame tileid="1424" duration="200"/>
  </animation>
 </tile>
 <tile id="1233">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1234">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0625" y="0.0625" width="7" height="31.9375"/>
   <object id="2" name="Melted Ice" type="water" x="7" y="0.0625" width="25.0625" height="31.875"/>
  </objectgroup>
  <animation>
   <frame tileid="1234" duration="200"/>
   <frame tileid="1426" duration="200"/>
  </animation>
 </tile>
 <tile id="1235">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="31.6875" y="1.6875">
    <polygon points="0.25,-0.0625 -13.625,1.125 -19.6875,3.3125 -23.6875,5.375 -28.75,10.1875 -30.8125,13.875 -31.75,19.125 -31.75,23.125 -29.6875,25.375 -27.1875,26.3125 -13.3125,27.25 -9.5,28.3125 0.3125,28.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1236">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="0.0625" y="0.6875">
    <polygon points="0,0 14.125,0.125 17.9375,2.25 26.9375,11.4375 27.875,14.3125 27.9375,20.4375 24.375,22.625 20.75,25.3125 14,25.5 12.75,27.25 6.875,29.1875 -0.0625,29.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1237">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="32" y="2.8125">
    <polygon points="0,0 -2.1875,0 -7.25,2.0625 -10.9375,4.0625 -19,3.9375 -24.1875,4.9375 -28,7 -31.0625,10 -32.0625,12 -32.0625,21.0625 -27.875,25.125 -17.125,25.3125 -16,27.0625 -13,28.0625 -10.9375,29.25 -3.0625,29.1875 -0.0625,28.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1238">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="1.8125">
    <polygon points="0,0 3.1875,-2 10.125,-1.9375 15.8125,0.1875 20.125,4.3125 22.125,8.0625 23.0625,13.25 23.125,19.1875 20,24.125 14.1875,28.25 0,29.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1239">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="-1.9375,-13.875 -2.0625,0 1.125,2.8125 7.125,6.1875 18.6875,6.3125 27.3125,4.0625 30,0.125 30.125,-7.6875 27,-13.375 21,-17.1875 17.3125,-20.6875 12.875,-22.9375 5.25,-22.9375 0.25,-18.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1240">
  <objectgroup draworder="index" id="2">
   <object id="2" x="14" y="11.6875">
    <polygon points="0,0 4.875,-0.0625 7.8125,0.8125 10,3.1875 10.3125,5.5 6,7.5 -2.1875,7.5 -3.5,6.25 -3.3125,3.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1241">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="31.6875" y="1.6875">
    <polygon points="0.25,-0.0625 -13.625,1.125 -19.6875,3.3125 -23.6875,5.375 -28.75,10.1875 -30.8125,13.875 -31.75,19.125 -31.75,23.125 -29.6875,25.375 -27.1875,26.3125 -13.3125,27.25 -9.5,28.3125 0.3125,28.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1242">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="0.0625" y="0.6875">
    <polygon points="0,0 14.125,0.125 17.9375,2.25 26.9375,11.4375 27.875,14.3125 27.9375,20.4375 24.375,22.625 20.75,25.3125 14,25.5 12.75,27.25 6.875,29.1875 -0.0625,29.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1243">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="32" y="2.8125">
    <polygon points="0,0 -2.1875,0 -7.25,2.0625 -10.9375,4.0625 -19,3.9375 -24.1875,4.9375 -28,7 -31.0625,10 -32.0625,12 -32.0625,21.0625 -27.875,25.125 -17.125,25.3125 -16,27.0625 -13,28.0625 -10.9375,29.25 -3.0625,29.1875 -0.0625,28.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1244">
  <objectgroup>
   <object id="1" name="Collision" type="boulder" x="-0.0625" y="1.8125">
    <polygon points="0,0 3.1875,-2 10.125,-1.9375 15.8125,0.1875 20.125,4.3125 22.125,8.0625 23.0625,13.25 23.125,19.1875 20,24.125 14.1875,28.25 0,29.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1245">
  <objectgroup>
   <object id="1" name="Collision" type="rock" x="1.9375" y="22.9375">
    <polygon points="-1.9375,-13.875 -2.0625,0 1.125,2.8125 7.125,6.1875 18.6875,6.3125 27.3125,4.0625 30,0.125 30.125,-7.6875 27,-13.375 21,-17.1875 17.3125,-20.6875 12.875,-22.9375 5.25,-22.9375 0.25,-18.4375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1246">
  <objectgroup>
   <object id="1" x="14" y="11.6875">
    <polygon points="0,0 4.875,-0.0625 7.8125,0.8125 10,3.1875 10.3125,5.5 6,7.5 -2.1875,7.5 -3.5,6.25 -3.3125,3.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1247">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13" y="0" width="6" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1248">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="13.0556" y="0" width="20.0505" height="32">
    <polygon points="-0.0546875,0 5.91988,0 5.97449,10.9688 18.9336,11 18.9366,31.9844 -0.0390625,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1249">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="0" width="32" height="32">
    <polygon points="12.993,10.994 13,0 19.0158,-0.0177083 19.0042,10.9944 32.0056,10.9944 32,32 0,32 -0.00555556,10.9922"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1250">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="18.9375" y="0" width="20.0505" height="32">
    <polygon points="0.0546875,0 -5.91988,0 -5.97449,10.9688 -18.9336,11 -18.9366,31.9844 0.0390625,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1251">
  <objectgroup>
   <object id="1" name="Fence" type="metal" x="0" y="0" width="19" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1252" type="stone"/>
 <tile id="1253" type="stairs"/>
 <tile id="1254" type="stairs"/>
 <tile id="1255" type="stairs"/>
 <tile id="1256" type="stairs"/>
 <tile id="1257" type="stairs"/>
 <tile id="1258" type="stairs"/>
 <tile id="1259" type="stairs"/>
 <tile id="1260" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1261" type="bridge"/>
 <tile id="1262" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1263" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1270" type="above"/>
 <tile id="1271" type="above"/>
 <tile id="1272" type="above"/>
 <tile id="1273" type="tile"/>
 <tile id="1274" type="tile"/>
 <tile id="1275" type="tile"/>
 <tile id="1276" type="tile"/>
 <tile id="1277" type="tile"/>
 <tile id="1278" type="tile"/>
 <tile id="1279" type="tile"/>
 <tile id="1280">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1280" duration="200"/>
   <frame tileid="1282" duration="200"/>
  </animation>
 </tile>
 <tile id="1281">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -3.125,-0.125 -4.5,-4.6875 -8.125,-8.1875 -12.5625,-11.6875 -17.9375,-13.3125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1281" duration="200"/>
   <frame tileid="1283" duration="200"/>
  </animation>
 </tile>
 <tile id="1282">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1283">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -3.125,-0.125 -4.5,-4.6875 -8.125,-8.1875 -12.5625,-11.6875 -17.9375,-13.3125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1284">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -9.4375,17.0625 -8.97656,8.75781 -2.26563,7.26563 0.03125,3.84375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1284" duration="200"/>
   <frame tileid="1286" duration="200"/>
  </animation>
 </tile>
 <tile id="1285">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="-1.8125,0 -6.5,0 -6.625,-3.375 -9.5,-7 -12.8125,-11.3125 -17.9375,-13.3125 -17.9375,-16.375 -13.125,-16 -10.3125,-13.3125 -9.6875,-9.5625 -8.4375,-8.0625 -4.6875,-8.1875 -2.0625,-4.875"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0.0625,0.625 4.9375,0.9375 7.8125,3.5625 8.3125,7.5625 9.6875,8.8125 13.4375,8.875 16,12 16.3125,16.9375 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1285" duration="200"/>
   <frame tileid="1287" duration="200"/>
  </animation>
 </tile>
 <tile id="1286">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -9.4375,17.0625 -8.97656,8.75781 -2.26563,7.26563 0.03125,3.84375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1287">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="-1.8125,0 -6.5,0 -6.625,-3.375 -9.5,-7 -12.8125,-11.3125 -17.9375,-13.3125 -17.9375,-16.375 -13.125,-16 -10.3125,-13.3125 -9.6875,-9.5625 -8.4375,-8.0625 -4.6875,-8.1875 -2.0625,-4.875"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0.0625,0.625 4.9375,0.9375 7.8125,3.5625 8.3125,7.5625 9.6875,8.8125 13.4375,8.875 16,12 16.3125,16.9375 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1288">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="1288" duration="200"/>
   <frame tileid="1290" duration="200"/>
  </animation>
 </tile>
 <tile id="1289">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="1289" duration="200"/>
   <frame tileid="1291" duration="200"/>
  </animation>
 </tile>
 <tile id="1290">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="1291">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="1292">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1292" duration="200"/>
   <frame tileid="1294" duration="200"/>
  </animation>
 </tile>
 <tile id="1293">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1293" duration="200"/>
   <frame tileid="1295" duration="200"/>
  </animation>
 </tile>
 <tile id="1294">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="1295">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="1296">
  <objectgroup>
   <object id="1" name="Water" type="water" x="25.125" y="0.1875" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="0.0625" y="32.125" width="31.8125" height="24.1875">
    <polygon points="0,0 31.8125,0 31.8125,-24.1875 25.0469,-24.1875 24.9688,-32 0,-32.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1296" duration="200"/>
   <frame tileid="1488" duration="200"/>
  </animation>
 </tile>
 <tile id="1297">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.125" height="7"/>
   <object id="2" name="Melted Ice" type="water" x="0.0625" y="7.125" width="32" height="25"/>
  </objectgroup>
  <animation>
   <frame tileid="1297" duration="200"/>
   <frame tileid="1489" duration="200"/>
  </animation>
 </tile>
 <tile id="1298">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0625" y="0.1875" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="32.0625" y="32.125" width="31.8125" height="24.1875">
    <polygon points="0,0 -31.8125,0 -31.8125,-24.1875 -25.0469,-24.1875 -24.9688,-32 0,-32.0625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1298" duration="200"/>
   <frame tileid="1490" duration="200"/>
  </animation>
 </tile>
 <tile id="1299" type="above"/>
 <tile id="1300" type="above"/>
 <tile id="1301" type="above"/>
 <tile id="1302" type="above"/>
 <tile id="1303" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1304" type="above"/>
 <tile id="1305" type="above"/>
 <tile id="1306" type="above"/>
 <tile id="1307" type="above"/>
 <tile id="1308" type="above"/>
 <tile id="1309" type="above"/>
 <tile id="1310" type="above"/>
 <tile id="1311" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13" y="0" width="6" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1312">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="13" y="0" width="19" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1313">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Fence" type="metal" x="0" y="0" width="32" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1314">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="metal" x="0" y="0" width="19" height="19"/>
  </objectgroup>
 </tile>
 <tile id="1315" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0" y="15.8409" width="32" height="16.1591"/>
  </objectgroup>
 </tile>
 <tile id="1316" type="stone"/>
 <tile id="1317" type="stairs"/>
 <tile id="1318" type="stairs"/>
 <tile id="1319" type="stairs"/>
 <tile id="1320" type="stairs"/>
 <tile id="1321" type="stairs"/>
 <tile id="1322" type="stairs"/>
 <tile id="1323" type="stairs"/>
 <tile id="1324" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1325" type="bridge"/>
 <tile id="1326" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1327" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
   <object id="2" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1337" type="tile"/>
 <tile id="1338" type="tile"/>
 <tile id="1339" type="tile"/>
 <tile id="1340" type="tile"/>
 <tile id="1341" type="tile"/>
 <tile id="1342" type="tile"/>
 <tile id="1343" type="tile"/>
 <tile id="1344">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -5.75,0.125 -7.75,-0.9375 -9,-3 -12.5,-2.9375 -14.9375,-4.9375 -16.1875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.8125,0 4.0625,0.125 4.5,4.6875 8.125,8.1875 12.5625,11.6875 17.9375,13.3125 18.0625,16.9375 12.3125,17.0625 10.1875,15.875 9.0625,13.9375 5.5,14 3.25,12.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1344" duration="200"/>
   <frame tileid="1346" duration="200"/>
  </animation>
 </tile>
 <tile id="1345">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.8125,1.0625 10.4375,-1.3125 11.9375,-4.125 12.3125,-6.3125 15.1875,-7.9375 15.75,-11.625 17.4375,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-0.5,0 -3.125,0.125 -4.5,4.6875 -8.125,8.1875 -12.5625,11.6875 -17.9375,13.3125 -18.0625,16.8125 -11.0625,18 -7.5625,15.6875 -5.625,10.6875 -2.875,8.9375 -2.25,5.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1345" duration="200"/>
   <frame tileid="1347" duration="200"/>
  </animation>
 </tile>
 <tile id="1346">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -5.75,0.125 -7.75,-0.9375 -9,-3 -12.5,-2.9375 -14.9375,-4.9375 -16.1875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.8125,0 4.0625,0.125 4.5,4.6875 8.125,8.1875 12.5625,11.6875 17.9375,13.3125 18.0625,16.9375 12.3125,17.0625 10.1875,15.875 9.0625,13.9375 5.5,14 3.25,12.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1347">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-0.5,0 -3.125,0.125 -4.5,4.6875 -8.125,8.1875 -12.5625,11.6875 -17.9375,13.3125 -18.0625,16.8125 -11.0625,18 -7.5625,15.6875 -5.625,10.6875 -2.875,8.9375 -2.25,5.125"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.8125,1.0625 10.4375,-1.3125 11.9375,-4.125 12.3125,-6.3125 15.1875,-7.9375 15.75,-11.625 17.4375,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1348">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.9375" y="-0.03125">
    <polygon points="1.8125,0 9.125,0 8.9375,2.3125 5.25,6.375 9.9375,11.125 17.9375,11 17.9375,16.375 14.625,18 10.0625,17 8.875,14.6875 5.0625,13.9375 3.3125,9.375 2.75,4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="16.9063">
    <polygon points="-0.0625,-0.625 -3.375,1.0625 -8.0625,0.0625 -9.3125,-2.25 -13,-3.125 -14.75,-7.5 -15.25,-12.5 -16.3125,-16.8125 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1348" duration="200"/>
   <frame tileid="1350" duration="200"/>
  </animation>
 </tile>
 <tile id="1349">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-1.8125,0 -8.3125,0 -8.9375,3.4375 -8.8125,8.8125 -9.9375,11.125 -17.9375,11 -17.9375,16.375 -14.625,18 -10.0625,17 -6.9375,15.3125 -5.8125,11.1875 -3.3125,9.375 -2.75,4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0.0625,-0.625 3.375,1.0625 8.0625,0.0625 11.125,-1.5625 12.1875,-5.8125 14.75,-7.5 15.25,-12.5 16.3125,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1349" duration="200"/>
   <frame tileid="1351" duration="200"/>
  </animation>
 </tile>
 <tile id="1350">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.9375" y="-0.03125">
    <polygon points="1.8125,0 9.125,0 8.9375,2.3125 5.25,6.375 9.9375,11.125 17.9375,11 17.9375,16.375 14.625,18 10.0625,17 8.875,14.6875 5.0625,13.9375 3.3125,9.375 2.75,4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="16.9063">
    <polygon points="-0.0625,-0.625 -3.375,1.0625 -8.0625,0.0625 -9.3125,-2.25 -13,-3.125 -14.75,-7.5 -15.25,-12.5 -16.3125,-16.8125 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1351">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-1.8125,0 -8.3125,0 -8.9375,3.4375 -8.8125,8.8125 -9.9375,11.125 -17.9375,11 -17.9375,16.375 -14.625,18 -10.0625,17 -6.9375,15.3125 -5.8125,11.1875 -3.3125,9.375 -2.75,4.625"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0.0625,-0.625 3.375,1.0625 8.0625,0.0625 11.125,-1.5625 12.1875,-5.8125 14.75,-7.5 15.25,-12.5 16.3125,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1352">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 31.875,6.875 16.4375,7.375 12.25,9.84375 5.375,11.875 0,11.9375"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.0625,4.125 5.3125,3.90625 12.5938,1.92188 16.7031,-0.601563 32.0625,-0.9375 32.0625,14.125 0,14.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1352" duration="200"/>
   <frame tileid="1354" duration="200"/>
  </animation>
 </tile>
 <tile id="1353">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 32.0625,10.8594 23.1875,10.7539 21.375,6.23242 15.8125,6.14844 10.3125,9.125 0.125,6"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.125,-1.875 10.3438,1.1875 15.7969,-1.8125 21.1797,-1.8125 23.4023,2.875 32.125,2.9375 32.0625,14.125 0,14.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1353" duration="200"/>
   <frame tileid="1355" duration="200"/>
  </animation>
 </tile>
 <tile id="1354">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.0625,4.125 5.3125,3.90625 12.5938,1.92188 16.7031,-0.601563 32.0625,-0.9375 32.0625,14.125 0,14.125"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 31.875,6.875 16.4375,7.375 12.25,9.84375 5.375,11.875 0,11.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1355">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 32.0625,10.8594 23.1875,10.7539 21.375,6.23242 15.8125,6.14844 10.3125,9.125 0.125,6"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.125,-1.875 10.3438,1.1875 15.7969,-1.8125 21.1797,-1.8125 23.4023,2.875 32.125,2.9375 32.0625,14.125 0,14.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1356">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="32" y="7.5">
    <polygon points="0,0 -13.125,9.5625 -14.875,11.375 -20.9375,18.6875 -23.25,24.5 0,24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="7.5">
    <polygon points="0,0 -13.125,9.5625 -14.875,11.375 -20.9375,18.6875 -23.25,24.5 -31.9688,24.4375 -32,-7.625 -0.03125,-7.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1356" duration="200"/>
   <frame tileid="1358" duration="200"/>
  </animation>
 </tile>
 <tile id="1357">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="7.5">
    <polygon points="0,0 13.125,9.5625 14.875,11.375 20.9375,18.6875 23.25,24.5 0,24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="7.5">
    <polygon points="0,0 13.125,9.5625 14.875,11.375 20.9375,18.6875 23.25,24.5 31.9688,24.4375 32,-7.625 0.03125,-7.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1357" duration="200"/>
   <frame tileid="1359" duration="200"/>
  </animation>
 </tile>
 <tile id="1358">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="7.5">
    <polygon points="0,0 -13.125,9.5625 -14.875,11.375 -20.9375,18.6875 -23.25,24.5 0,24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="7.5">
    <polygon points="0,0 -13.125,9.5625 -14.875,11.375 -20.9375,18.6875 -23.25,24.5 -31.9688,24.4375 -32,-7.625 -0.03125,-7.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1359">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="7.5">
    <polygon points="0,0 13.125,9.5625 14.875,11.375 20.9375,18.6875 23.25,24.5 0,24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="7.5">
    <polygon points="0,0 13.125,9.5625 14.875,11.375 20.9375,18.6875 23.25,24.5 31.9688,24.4375 32,-7.625 0.03125,-7.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1360">
  <objectgroup>
   <object id="1" name="Water" type="water" x="25.125" y="24.3125" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="0.0625" y="0.0625" width="31.8125" height="24.1875">
    <polygon points="0,0 31.8125,0 31.8125,24.1875 25.0469,24.1875 24.9688,32 0,32.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1361">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.0625" y="0" width="32" height="26.0625"/>
   <object id="2" name="Water" type="water" x="0" y="26.0625" width="32.125" height="6"/>
  </objectgroup>
 </tile>
 <tile id="1362">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0625" y="24.3125" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="32.0625" y="0.0625" width="31.8125" height="24.1875">
    <polygon points="0,0 -31.8125,0 -31.8125,24.1875 -25.0469,24.1875 -24.9688,32 0,32.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1363" type="above"/>
 <tile id="1364" type="above"/>
 <tile id="1365" type="above"/>
 <tile id="1366" type="above"/>
 <tile id="1367" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1368" type="above"/>
 <tile id="1369" type="above"/>
 <tile id="1370" type="above"/>
 <tile id="1371" type="above"/>
 <tile id="1372" type="above"/>
 <tile id="1373" type="above"/>
 <tile id="1374" type="above"/>
 <tile id="1375" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="wood" x="32" y="0" width="21" height="32">
    <polygon points="-10.9091,7 -10.9545,0 -21,0 -21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1376" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="32" height="32">
    <polygon points="-0.00339674,6.99558 10.9891,7.00243 11.0016,0 21.0227,-0.015625 21.0369,6.97443 32,6.97443 32,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1377" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="21" height="32">
    <polygon points="10.9091,7 10.9545,0 21,0 21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1378" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0" y="0.204545" width="32" height="31.7955"/>
  </objectgroup>
 </tile>
 <tile id="1379" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0" y="0.113636" width="32" height="31.8864"/>
  </objectgroup>
 </tile>
 <tile id="1380" type="stone"/>
 <tile id="1381" type="stairs"/>
 <tile id="1382" type="stairs"/>
 <tile id="1383" type="stairs"/>
 <tile id="1384" type="stairs"/>
 <tile id="1385" type="stairs"/>
 <tile id="1386" type="stairs"/>
 <tile id="1387" type="stairs"/>
 <tile id="1388" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1389" type="bridge"/>
 <tile id="1390" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1391" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1401" type="tile"/>
 <tile id="1402" type="tile"/>
 <tile id="1403" type="tile"/>
 <tile id="1404" type="tile"/>
 <tile id="1405" type="tile"/>
 <tile id="1406" type="tile"/>
 <tile id="1407" type="tile"/>
 <tile id="1408">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.125,13.75 -10.875,17.0625 -13.9375,19.625 -14.125,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1408" duration="200"/>
   <frame tileid="1411" duration="200"/>
  </animation>
 </tile>
 <tile id="1409">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="-0.0625" y="16.125" width="32.0625" height="15.875"/>
  </objectgroup>
  <animation>
   <frame tileid="1409" duration="200"/>
   <frame tileid="1412" duration="200"/>
  </animation>
 </tile>
 <tile id="1410">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.125" y="8.8125">
    <polygon points="0,23.1875 -0.1875,9.5625 2.8125,9.6875 6.5,13.25 8.625,14.5 11.75,18.625 12.875,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1410" duration="200"/>
   <frame tileid="1413" duration="200"/>
  </animation>
 </tile>
 <tile id="1411">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.125,13.75 -10.875,17.0625 -13.9375,19.625 -14.125,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1412">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.0625" y="16.125" width="32.0625" height="15.875"/>
  </objectgroup>
 </tile>
 <tile id="1413">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.125" y="8.8125">
    <polygon points="0,23.1875 -0.1875,9.5625 2.8125,9.6875 6.5,13.25 8.625,14.5 11.75,18.625 12.875,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1414">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.125,6.8125 0,14.375 -5.6875,16.75 -7.75,19 -10.5,20.75 -13.0625,23.375 -15.1875,23.25 -14.75,16.375 -8,13.125 -6.8125,8.1875 -3.625,8.25"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,14.4375 -5.625,16.8125 -7.5625,19 -10.625,21.0625 -12.8125,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1414" duration="200"/>
   <frame tileid="1417" duration="200"/>
  </animation>
 </tile>
 <tile id="1415">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.1875" y="14.75" width="32" height="7.4375"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="22.0625" width="32.0625" height="9.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="1415" duration="200"/>
   <frame tileid="1418" duration="200"/>
  </animation>
 </tile>
 <tile id="1416">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.125" y="8.75">
    <polygon points="-0.125,6.8125 0,14.375 5.6875,16.75 7.75,19 10.5,20.75 13.0625,23.375 15.1875,23.25 14.75,16.375 8,13.125 6.8125,8.1875 3.625,8.25"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="8.75">
    <polygon points="0,23.1875 -0.0625,14.4375 5.625,16.8125 7.5625,19 10.625,21.0625 12.8125,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1416" duration="200"/>
   <frame tileid="1419" duration="200"/>
  </animation>
 </tile>
 <tile id="1417">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.125,6.8125 0,14.375 -5.6875,16.75 -7.75,19 -10.5,20.75 -13.0625,23.375 -15.1875,23.25 -14.75,16.375 -8,13.125 -6.8125,8.1875 -3.625,8.25"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,14.4375 -5.625,16.8125 -7.5625,19 -10.625,21.0625 -12.8125,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1418">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.1875" y="14.75" width="32" height="7.4375"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="22.0625" width="32.0625" height="9.9375"/>
  </objectgroup>
 </tile>
 <tile id="1419">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.125" y="8.75">
    <polygon points="0,23.1875 -0.0625,14.4375 5.625,16.8125 7.5625,19 10.625,21.0625 12.8125,23.3125"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="-0.125" y="8.75">
    <polygon points="-0.125,6.8125 0,14.375 5.6875,16.75 7.75,19 10.5,20.75 13.0625,23.375 15.1875,23.25 14.75,16.375 8,13.125 6.8125,8.1875 3.625,8.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1420">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="24.375">
    <polygon points="0,0 -13.125,-9.5625 -14.875,-11.375 -20.9375,-18.6875 -23.25,-24.5 0,-24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="24.375">
    <polygon points="0,0 -13.125,-9.5625 -14.875,-11.375 -20.9375,-18.6875 -23.25,-24.5 -31.9688,-24.4375 -32,7.625 -0.03125,7.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1420" duration="200"/>
   <frame tileid="1422" duration="200"/>
  </animation>
 </tile>
 <tile id="1421">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="24.375">
    <polygon points="0,0 13.125,-9.5625 14.875,-11.375 20.9375,-18.6875 23.25,-24.5 0,-24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="24.375">
    <polygon points="0,0 13.125,-9.5625 14.875,-11.375 20.9375,-18.6875 23.25,-24.5 31.9688,-24.4375 32,7.625 0.03125,7.5625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1421" duration="200"/>
   <frame tileid="1423" duration="200"/>
  </animation>
 </tile>
 <tile id="1422">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="24.375">
    <polygon points="0,0 -13.125,-9.5625 -14.875,-11.375 -20.9375,-18.6875 -23.25,-24.5 0,-24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="24.375">
    <polygon points="0,0 -13.125,-9.5625 -14.875,-11.375 -20.9375,-18.6875 -23.25,-24.5 -31.9688,-24.4375 -32,7.625 -0.03125,7.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1423">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="24.375">
    <polygon points="0,0 13.125,-9.5625 14.875,-11.375 20.9375,-18.6875 23.25,-24.5 0,-24.5"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="24.375">
    <polygon points="0,0 13.125,-9.5625 14.875,-11.375 20.9375,-18.6875 23.25,-24.5 31.9688,-24.4375 32,7.625 0.03125,7.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1424">
  <objectgroup draworder="index" id="2">
   <object id="3" name="Melted Ice" type="water" x="0.0625" y="0.0625" width="25.0625" height="31.875"/>
   <object id="4" name="Water" type="water" x="25.0625" y="0.0625" width="7" height="31.9375"/>
  </objectgroup>
 </tile>
 <tile id="1425">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1426">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="7" y="0" width="25.0625" height="31.875"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="7" height="31.9375"/>
  </objectgroup>
 </tile>
 <tile id="1427" type="above"/>
 <tile id="1428" type="above"/>
 <tile id="1429" type="above"/>
 <tile id="1430" type="above"/>
 <tile id="1431" type="above"/>
 <tile id="1432" type="above"/>
 <tile id="1433" type="above"/>
 <tile id="1434" type="above"/>
 <tile id="1435" type="above"/>
 <tile id="1436" type="above"/>
 <tile id="1437" type="above"/>
 <tile id="1438" type="above"/>
 <tile id="1439" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="32" y="0" width="21" height="32">
    <polygon points="-10.9091,7 -10.9545,0 -21,0 -21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1440" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="32" height="32">
    <polygon points="-0.00339674,6.99558 10.9891,7.00243 11.0016,0 21.0227,-0.015625 21.0369,6.97443 32,6.97443 32,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1441" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="21" height="32">
    <polygon points="10.9091,7 10.9545,0 21,0 21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1445" type="stairs"/>
 <tile id="1446" type="stairs"/>
 <tile id="1447" type="stairs"/>
 <tile id="1448" type="stairs"/>
 <tile id="1449" type="stairs"/>
 <tile id="1450" type="stairs"/>
 <tile id="1451" type="stairs"/>
 <tile id="1452" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1453" type="bridge"/>
 <tile id="1454" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1455" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.09091" height="32"/>
   <object id="2" name="Railing" type="wood" x="26.9375" y="-0.125" width="5" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1466" type="wood"/>
 <tile id="1467" type="wood"/>
 <tile id="1468" type="tile"/>
 <tile id="1469" type="tile"/>
 <tile id="1470" type="tile"/>
 <tile id="1471" type="tile"/>
 <tile id="1472">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="17.0625" y="-0.0625" width="14.875" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1472" duration="200"/>
   <frame tileid="1475" duration="200"/>
  </animation>
 </tile>
 <tile id="1473">
  <animation>
   <frame tileid="1473" duration="200"/>
   <frame tileid="1476" duration="200"/>
  </animation>
 </tile>
 <tile id="1474">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="15.875" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1474" duration="200"/>
   <frame tileid="1477" duration="200"/>
  </animation>
 </tile>
 <tile id="1475">
  <objectgroup>
   <object id="1" name="Water" type="water" x="17.0625" y="-0.0625" width="14.875" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1477">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.0625" y="-0.0625" width="15.875" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1478">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1478" duration="200"/>
   <frame tileid="1481" duration="200"/>
  </animation>
 </tile>
 <tile id="1479">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1479" duration="200"/>
   <frame tileid="1482" duration="200"/>
  </animation>
 </tile>
 <tile id="1480">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1480" duration="200"/>
   <frame tileid="1483" duration="200"/>
  </animation>
 </tile>
 <tile id="1481">
  <objectgroup>
   <object id="1" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
   <object id="2" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="1482">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1483">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1484">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1484" duration="200"/>
   <frame tileid="1612" duration="200"/>
  </animation>
 </tile>
 <tile id="1485">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1485" duration="200"/>
   <frame tileid="1613" duration="200"/>
  </animation>
 </tile>
 <tile id="1486">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1487">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1488">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="25.125" y="0.1875" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="0.0625" y="32.125" width="31.8125" height="24.1875">
    <polygon points="0,0 31.8125,0 31.8125,-24.1875 25.0469,-24.1875 24.9688,-32 0,-32.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1489">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.0625" y="7.125" width="32" height="25"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="32.125" height="7"/>
  </objectgroup>
 </tile>
 <tile id="1490">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0625" y="0.1875" width="6.9375" height="7.6875"/>
   <object id="2" name="Melted Ice" type="water" x="32.0625" y="32.125" width="31.8125" height="24.1875">
    <polygon points="0,0 -31.8125,0 -31.8125,-24.1875 -25.0469,-24.1875 -24.9688,-32 0,-32.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1491" type="above"/>
 <tile id="1492" type="above"/>
 <tile id="1493" type="above"/>
 <tile id="1494" type="above"/>
 <tile id="1495" type="above"/>
 <tile id="1496" type="above"/>
 <tile id="1497" type="above"/>
 <tile id="1498" type="above"/>
 <tile id="1499" type="above"/>
 <tile id="1500" type="above"/>
 <tile id="1501" type="above"/>
 <tile id="1502" type="above"/>
 <tile id="1503" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="32" y="0" width="21" height="32">
    <polygon points="-10.9091,7 -10.9545,0 -21,0 -21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1504" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="32" height="32">
    <polygon points="-0.00339674,6.99558 10.9891,7.00243 11.0016,0 21.0227,-0.015625 21.0369,6.97443 32,6.97443 32,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1505" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="21" height="32">
    <polygon points="10.9091,7 10.9545,0 21,0 21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1509" type="stairs"/>
 <tile id="1510" type="stairs"/>
 <tile id="1511" type="stairs"/>
 <tile id="1512" type="stairs"/>
 <tile id="1513" type="stairs"/>
 <tile id="1514" type="stairs"/>
 <tile id="1515" type="stairs"/>
 <tile id="1516" type="bridge">
  <objectgroup>
   <object id="1" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1517" type="bridge"/>
 <tile id="1518" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1519" type="bridge">
  <objectgroup>
   <object id="1" x="26.9684" y="0" width="5.03162" height="16"/>
   <object id="2" name="Railing" type="wood" x="0" y="0" width="5.05138" height="16"/>
  </objectgroup>
 </tile>
 <tile id="1530" type="stone"/>
 <tile id="1531" type="stone"/>
 <tile id="1532" type="stone"/>
 <tile id="1533" type="stone"/>
 <tile id="1534" type="stone"/>
 <tile id="1535" type="stone"/>
 <tile id="1536">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.75" y="23.375">
    <polygon points="0.1875,-23.25 0.125,-11.5625 -3,-11.75 -6.5,-13.25 -8.625,-14.5 -11.75,-18.625 -12.875,-23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1536" duration="200"/>
   <frame tileid="1539" duration="200"/>
  </animation>
 </tile>
 <tile id="1537">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="15.3125"/>
  </objectgroup>
  <animation>
   <frame tileid="1537" duration="200"/>
   <frame tileid="1540" duration="200"/>
  </animation>
 </tile>
 <tile id="1538">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.125" y="23.25">
    <polygon points="0,-23.1875 -0.1875,-9.5625 2.8125,-9.6875 6.5,-13.25 8.625,-14.5 11.75,-18.625 12.875,-23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1538" duration="200"/>
   <frame tileid="1541" duration="200"/>
  </animation>
 </tile>
 <tile id="1539">
  <objectgroup>
   <object id="1" name="Water" type="water" x="31.75" y="23.375">
    <polygon points="0.1875,-23.25 0.125,-11.5625 -3,-11.75 -6.5,-13.25 -8.625,-14.5 -11.75,-18.625 -12.875,-23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1540">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="15.3125"/>
  </objectgroup>
 </tile>
 <tile id="1541">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.125" y="23.25">
    <polygon points="0,-23.1875 -0.1875,-9.5625 2.8125,-9.6875 6.5,-13.25 8.625,-14.5 11.75,-18.625 12.875,-23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1542">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,14.9375 5.625,14.9375 5.5,12.25 3.0625,8.9375 -0.75,7.75 -1.5625,6.75 -2.75,2.6875 -2.625,-0.125"/>
   </object>
   <object id="2" name="Water" type="water" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,-0.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1542" duration="200"/>
   <frame tileid="1545" duration="200"/>
  </animation>
 </tile>
 <tile id="1543">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0" y="0" width="32.0625" height="11.375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="11.375" width="32.125" height="7.5"/>
  </objectgroup>
  <animation>
   <frame tileid="1543" duration="200"/>
   <frame tileid="1546" duration="200"/>
  </animation>
 </tile>
 <tile id="1544">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="23.1875">
    <polygon points="-0.125,-6.8125 0.0625,-12.25 5.25,-13.3125 7.9375,-15.6875 8.1875,-18.125 12.4375,-23.375 15.1875,-23.25 14.75,-16.375 8,-13.125 6.8125,-8.1875 3.625,-8.25"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="23.1875">
    <polygon points="0,-23.1875 0.0625,-12.3125 5.3125,-13.375 7.9375,-15.75 8.25,-18.1875 12.3125,-23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1544" duration="200"/>
   <frame tileid="1547" duration="200"/>
  </animation>
 </tile>
 <tile id="1545">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,14.9375 5.625,14.9375 5.5,12.25 3.0625,8.9375 -0.75,7.75 -1.5625,6.75 -2.75,2.6875 -2.625,-0.125"/>
   </object>
   <object id="2" name="Water" type="water" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1546">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.0625" y="11.375" width="32.125" height="7.5"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="32.0625" height="11.375"/>
  </objectgroup>
 </tile>
 <tile id="1547">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="23.1875">
    <polygon points="-0.125,-6.8125 0.0625,-12.25 5.25,-13.3125 7.9375,-15.6875 8.1875,-18.125 12.4375,-23.375 15.1875,-23.25 14.75,-16.375 8,-13.125 6.8125,-8.1875 3.625,-8.25"/>
   </object>
   <object id="2" name="Water" type="water" x="0" y="23.1875">
    <polygon points="0,-23.1875 0.0625,-12.3125 5.3125,-13.375 7.9375,-15.75 8.25,-18.1875 12.3125,-23.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1548">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1548" duration="200"/>
   <frame tileid="1676" duration="200"/>
  </animation>
 </tile>
 <tile id="1549">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1549" duration="200"/>
   <frame tileid="1677" duration="200"/>
  </animation>
 </tile>
 <tile id="1550">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1551">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="11.9091">
    <polygon points="0,3.81818 -4.81818,6 -10.3636,9.81818 -14.0909,15.8182 -16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1551" duration="200"/>
   <frame tileid="1935" duration="200"/>
   <frame tileid="1743" duration="200"/>
   <frame tileid="1935" duration="200"/>
  </animation>
 </tile>
 <tile id="1552">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="16" width="31.875" height="15.75"/>
  </objectgroup>
  <animation>
   <frame tileid="1552" duration="200"/>
   <frame tileid="1936" duration="200"/>
   <frame tileid="1744" duration="200"/>
   <frame tileid="1936" duration="200"/>
  </animation>
 </tile>
 <tile id="1553">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0909091" y="12">
    <polygon points="0,3.81818 4.81818,6 10.3636,9.81818 14.0909,15.8182 16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1553" duration="200"/>
   <frame tileid="1937" duration="200"/>
   <frame tileid="1745" duration="200"/>
   <frame tileid="1937" duration="200"/>
  </animation>
 </tile>
 <tile id="1554">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.193017,3.95652 -7.66025,6.09802 -14.1173,12.088 -15.9397,20.0307 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1554" duration="200"/>
   <frame tileid="1810" duration="200"/>
   <frame tileid="1682" duration="200"/>
   <frame tileid="1810" duration="200"/>
  </animation>
 </tile>
 <tile id="1555" type="above"/>
 <tile id="1556" type="above"/>
 <tile id="1557" type="above"/>
 <tile id="1558" type="above"/>
 <tile id="1559" type="above"/>
 <tile id="1560" type="above"/>
 <tile id="1561" type="above"/>
 <tile id="1562" type="above"/>
 <tile id="1563" type="above"/>
 <tile id="1564" type="above"/>
 <tile id="1565" type="above"/>
 <tile id="1566" type="above"/>
 <tile id="1567" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="32" y="0" width="21" height="32">
    <polygon points="-10.9091,7 -10.9545,0 -21,0 -21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1568" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="6.72727" width="32" height="25.2727"/>
  </objectgroup>
 </tile>
 <tile id="1569" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="21" height="32">
    <polygon points="10.9091,7 10.9545,0 21,0 21,32 0,32 0,6.90909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1573" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="12.625" y="5.875" width="19.5" height="26.125"/>
  </objectgroup>
 </tile>
 <tile id="1574" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0" y="5.875" width="19.5" height="26.125"/>
  </objectgroup>
 </tile>
 <tile id="1575" type="stairs"/>
 <tile id="1576" type="stairs"/>
 <tile id="1577" type="stairs"/>
 <tile id="1578" type="stairs"/>
 <tile id="1594" type="stone"/>
 <tile id="1595" type="stone"/>
 <tile id="1596" type="stone"/>
 <tile id="1597" type="stone"/>
 <tile id="1598" type="stone"/>
 <tile id="1599" type="stone"/>
 <tile id="1600">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -11.5625,9.5 -12.6875,13.3125 -13.5,16.875 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1600" duration="200"/>
   <frame tileid="1602" duration="200"/>
  </animation>
 </tile>
 <tile id="1601">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.109375" y="14.9375">
    <polygon points="0,0 5.375,3 9.3125,4.5625 12.1875,5.0625 15.8125,7.3125 16.75,10.3125 17,17.0625 32.0391,17.0703 32.1406,-14.9219 -0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1601" duration="200"/>
   <frame tileid="1603" duration="200"/>
  </animation>
 </tile>
 <tile id="1603">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.109375" y="14.9375">
    <polygon points="0,0 5.375,3 9.3125,4.5625 12.1875,5.0625 15.8125,7.3125 16.75,10.3125 17,17.0625 32.0391,17.0703 32.1406,-14.9219 -0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1604">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -7.9375,17 -7.60156,12.0078 -4.70313,10.4531 0.03125,8.09375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1604" duration="200"/>
   <frame tileid="1606" duration="200"/>
  </animation>
 </tile>
 <tile id="1605">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -9.875,0 -10.4375,-4.75 -13.3125,-7.0625 -17.9375,-9.125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1605" duration="200"/>
   <frame tileid="1607" duration="200"/>
  </animation>
 </tile>
 <tile id="1606">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -7.9375,17 -7.60156,12.0078 -4.70313,10.4531 0.03125,8.09375"/>
   </object>
   <object id="2" name="Water" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1607">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -9.875,0 -10.4375,-4.75 -13.3125,-7.0625 -17.9375,-9.125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1608">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1608" duration="200"/>
   <frame tileid="1610" duration="200"/>
  </animation>
 </tile>
 <tile id="1609">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1609" duration="200"/>
   <frame tileid="1611" duration="200"/>
  </animation>
 </tile>
 <tile id="1610">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1611">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1612">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1613">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1614">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1615">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="16.125" y="0" width="16" height="31.75"/>
  </objectgroup>
  <animation>
   <frame tileid="1615" duration="200"/>
   <frame tileid="1999" duration="200"/>
   <frame tileid="1807" duration="200"/>
   <frame tileid="1999" duration="200"/>
  </animation>
 </tile>
 <tile id="1616">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1617">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0" width="16" height="31.75"/>
  </objectgroup>
  <animation>
   <frame tileid="1617" duration="200"/>
   <frame tileid="2001" duration="200"/>
   <frame tileid="1809" duration="200"/>
   <frame tileid="2001" duration="200"/>
  </animation>
 </tile>
 <tile id="1618">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="20.0435">
    <polygon points="-0.193017,-3.95652 -7.66025,-6.09802 -14.1173,-12.088 -15.9397,-20.0307 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1618" duration="200"/>
   <frame tileid="1874" duration="200"/>
   <frame tileid="1746" duration="200"/>
   <frame tileid="1874" duration="200"/>
  </animation>
 </tile>
 <tile id="1619" type="above"/>
 <tile id="1620" type="above"/>
 <tile id="1621" type="above"/>
 <tile id="1622" type="above"/>
 <tile id="1623" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1624" type="above"/>
 <tile id="1625" type="above"/>
 <tile id="1626" type="above"/>
 <tile id="1627" type="above"/>
 <tile id="1628" type="above"/>
 <tile id="1629" type="above"/>
 <tile id="1630" type="above"/>
 <tile id="1631" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="11" y="0" width="10" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1632" type="above" probability="0.3">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="0" y="0" width="32" height="32">
    <polygon points="-0.00339674,6.99558 10.9891,7.00243 11.0016,0 21.0227,-0.015625 21.0369,6.97443 32,6.97443 32,32 0,32"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1633" type="above" probability="0.3">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="11" y="0" width="10" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1634" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="18.8186" y="0.0434783" width="2.82609" height="31.9565">
    <polygon points="13.1797,-0.0429688 -2.82609,0 -2.82609,31.9565 0,31.9565 0.00339674,1.71739 13.1814,1.69854"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1635" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0" y="0.0340909" width="31.9091" height="1.80114"/>
  </objectgroup>
 </tile>
 <tile id="1636" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="13.1739" y="0.0434783" width="2.82609" height="31.9565">
    <polygon points="-13.1797,-0.0429688 2.82609,0 2.82609,31.9565 0,31.9565 -0.00339674,1.71739 -13.1814,1.69854"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1637" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="12.625" y="0.125" width="19.5" height="19">
    <polygon points="0,0 3.875,-0.125 3.875,15.375 19.5,15.25 19.5,19 0,19"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1638" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="19.5" y="0.125" width="19.5" height="19">
    <polygon points="0,0 -3.875,-0.125 -3.875,15.375 -19.5,15.25 -19.5,19 0,19"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1639" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="0.125" y="13.75" width="32.125" height="18.25">
    <polygon points="0,12.375 8.28125,12.375 8.29688,8.3125 16.1875,8.25 16.2188,4 24.1719,4 24.1484,0.0625 32.125,0 32.125,18.25 0,18.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1640" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="-0.125" y="-2.25" width="32.125" height="18.25">
    <polygon points="0,12.375 8.28125,12.375 8.29688,8.3125 16.1875,8.25 16.2188,4 24.1719,4 24.1484,2.4375 32.125,2.5 32.375,34.25 0.125,34.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1641" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="32.25" y="-2.25" width="32.125" height="18.25">
    <polygon points="0,12.375 -8.28125,12.375 -8.29688,8.3125 -16.1875,8.25 -16.2188,4 -24.1719,4 -24.1484,2.4375 -32.125,2.5 -32.375,34.25 -0.125,34.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1642" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="32.25" y="13.75" width="32.125" height="18.25">
    <polygon points="0,12.375 -8.28125,12.375 -8.29688,8.3125 -16.1875,8.25 -16.2188,4 -24.1719,4 -24.1484,0.0625 -32.125,0 -32.125,18.25 0,18.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1658" type="stone"/>
 <tile id="1659" type="stone"/>
 <tile id="1660" type="stone"/>
 <tile id="1661" type="stone"/>
 <tile id="1662" type="stone"/>
 <tile id="1663" type="stone"/>
 <tile id="1664">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32" y="17.0859">
    <polygon points="0.0625,-2.5 -5.25,-2.125 -9,-4.5 -11,-6.0625 -14,-5.0625 -14.875,-13 -14.375,-17.0625 -32.0391,-17.0703 -32.1406,14.9219 0.03125,14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1664" duration="200"/>
   <frame tileid="1666" duration="200"/>
  </animation>
 </tile>
 <tile id="1665">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.109375" y="17.0859">
    <polygon points="0,0 5.5625,-3.9375 11,-3.3125 12.125,-6.3125 14,-11.8125 16.8125,-13.0625 17.125,-17.0625 32.0391,-17.0703 32.1406,14.9219 -0.03125,14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1665" duration="200"/>
   <frame tileid="1667" duration="200"/>
  </animation>
 </tile>
 <tile id="1666">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32" y="17.0859">
    <polygon points="0.0625,-2.5 -5.25,-2.125 -9,-4.5 -11,-6.0625 -14,-5.0625 -14.875,-13 -14.375,-17.0625 -32.0391,-17.0703 -32.1406,14.9219 0.03125,14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1667">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.109375" y="17.0859">
    <polygon points="0,0 5.5625,-3.9375 11,-3.3125 12.125,-6.3125 14,-11.8125 16.8125,-13.0625 17.125,-17.0625 32.0391,-17.0703 32.1406,14.9219 -0.03125,14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1668">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.125,0 9.875,0 10.4375,4.75 13.3125,7.0625 17.9375,9.125 18.0625,16.8125 11.8125,15.6875 11.9375,12.875 6.375,12.875 4.25,11.9375 3.6875,5.5625"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -6.25,-1.25 -6.25,-4.0625 -11.5625,-4 -13.8125,-5 -14.3125,-11.1875 -16.875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1668" duration="200"/>
   <frame tileid="1670" duration="200"/>
  </animation>
 </tile>
 <tile id="1669">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="0,0 -9.875,0 -10.4375,4.75 -13.3125,7.0625 -17.9375,9.125 -18.0625,16.8125 -11.8125,15.6875 -9.625,13.375 -6.375,12.875 -4.9375,12.0625 -4.625,6.4375 -1.71875,4.5"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.25,-1.25 8.5625,-3.6875 11.9375,-4.125 13.25,-5 13.5,-10.5 16.3125,-12.4375 18.125,-16.875 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1669" duration="200"/>
   <frame tileid="1671" duration="200"/>
  </animation>
 </tile>
 <tile id="1670">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.125,0 9.875,0 10.4375,4.75 13.3125,7.0625 17.9375,9.125 18.0625,16.8125 11.8125,15.6875 11.9375,12.875 6.375,12.875 4.25,11.9375 3.6875,5.5625"/>
   </object>
   <object id="2" name="Water" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -6.25,-1.25 -6.25,-4.0625 -11.5625,-4 -13.8125,-5 -14.3125,-11.1875 -16.875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1671">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="0,0 -9.875,0 -10.4375,4.75 -13.3125,7.0625 -17.9375,9.125 -18.0625,16.8125 -11.8125,15.6875 -9.625,13.375 -6.375,12.875 -4.9375,12.0625 -4.625,6.4375 -1.71875,4.5"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.25,-1.25 8.5625,-3.6875 11.9375,-4.125 13.25,-5 13.5,-10.5 16.3125,-12.4375 18.125,-16.875 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1672">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1672" duration="200"/>
   <frame tileid="1674" duration="200"/>
  </animation>
 </tile>
 <tile id="1673">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="1673" duration="200"/>
   <frame tileid="1675" duration="200"/>
  </animation>
 </tile>
 <tile id="1674">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1675">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Water" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="1676">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1677">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1678">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1679">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="19.9091">
    <polygon points="0,-3.81818 -4.81818,-6 -10.3636,-9.81818 -14.0909,-15.8182 -16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1679" duration="200"/>
   <frame tileid="2063" duration="200"/>
   <frame tileid="1871" duration="200"/>
   <frame tileid="2063" duration="200"/>
  </animation>
 </tile>
 <tile id="1680">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0.125" width="31.875" height="15.75"/>
  </objectgroup>
  <animation>
   <frame tileid="1680" duration="200"/>
   <frame tileid="2064" duration="200"/>
   <frame tileid="1872" duration="200"/>
   <frame tileid="2064" duration="200"/>
  </animation>
 </tile>
 <tile id="1681">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="5.32907e-15" y="20">
    <polygon points="0,-3.81818 4.81818,-6 10.3636,-9.81818 14.0909,-15.8182 16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1681" duration="200"/>
   <frame tileid="2065" duration="200"/>
   <frame tileid="1873" duration="200"/>
   <frame tileid="2065" duration="200"/>
  </animation>
 </tile>
 <tile id="1682">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.193017,3.95652 -7.66025,6.09802 -14.1173,12.088 -15.9397,20.0307 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1683" type="above"/>
 <tile id="1684" type="above"/>
 <tile id="1685" type="above"/>
 <tile id="1686" type="above"/>
 <tile id="1687" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1688" type="above"/>
 <tile id="1689" type="above"/>
 <tile id="1690" type="above"/>
 <tile id="1691" type="above"/>
 <tile id="1692" type="above"/>
 <tile id="1693" type="above"/>
 <tile id="1694" type="above"/>
 <tile id="1695" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fence" type="wood" x="14" y="0" width="4" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1696" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="11" y="0" width="10" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1697" type="above">
  <objectgroup>
   <object id="1" name="Fence" type="wood" x="11" y="0" width="10" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1698" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="16.0177" y="0.130435" width="2.82609" height="31.8696"/>
  </objectgroup>
 </tile>
 <tile id="1699" type="stone"/>
 <tile id="1700" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="13.1739" y="0.130435" width="2.82609" height="31.8696"/>
  </objectgroup>
 </tile>
 <tile id="1701" type="stone"/>
 <tile id="1702" type="stone"/>
 <tile id="1703" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="32.25" y="25.69" width="32.125" height="13.5889">
    <polygon points="-0.191667,-9.7505 -8.28125,-9.71439 -8.29688,-6.18946 -16.1875,-6.14293 -16.2632,-1.75617 -24.1719,-1.75617 -24.1484,2.31004 -32.2444,2.26351 -32.375,-25.5025 -0.125,-25.5025"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1704" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="24" y="0">
    <polygon points="0.1875,0 0.125,3.875 -8,3.8125 -8,7.8125 -15.875,7.8125 -15.875,12 -23.9375,11.9375 -24,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1705" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="8" y="0">
    <polygon points="-0.1875,0 -0.125,3.875 8,3.8125 8,7.8125 15.875,7.8125 15.875,12 23.9375,11.9375 24,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1706" type="stairs">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="-0.25" y="25.69" width="32.125" height="13.5889">
    <polygon points="0.191667,-9.7505 8.28125,-9.71439 8.29688,-6.18946 16.1875,-6.14293 16.2632,-1.75617 24.1719,-1.75617 24.1484,2.31004 32.2444,2.26351 32.375,-25.5025 0.125,-25.5025"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1722" type="stone"/>
 <tile id="1723" type="stone"/>
 <tile id="1724" type="stone"/>
 <tile id="1725" type="stone"/>
 <tile id="1726" type="stone"/>
 <tile id="1727" type="stone"/>
 <tile id="1728">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Water" type="water" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1728" duration="200"/>
   <frame tileid="1738" duration="200"/>
   <frame tileid="1733" duration="200"/>
   <frame tileid="1738" duration="200"/>
  </animation>
 </tile>
 <tile id="1729">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0" y="12.0909" width="32" height="19.9091"/>
  </objectgroup>
  <animation>
   <frame tileid="1729" duration="200"/>
   <frame tileid="1739" duration="200"/>
   <frame tileid="1734" duration="200"/>
   <frame tileid="1739" duration="200"/>
  </animation>
 </tile>
 <tile id="1730">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.181818" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1730" duration="200"/>
   <frame tileid="1740" duration="200"/>
   <frame tileid="1735" duration="200"/>
   <frame tileid="1740" duration="200"/>
  </animation>
 </tile>
 <tile id="1731">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.106061,8 -6.00808,10.0545 -10.0303,13.9576 -12.1136,19.9872 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1731" duration="200"/>
   <frame tileid="1741" duration="200"/>
   <frame tileid="1736" duration="200"/>
   <frame tileid="1741" duration="200"/>
  </animation>
 </tile>
 <tile id="1732">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.100316" y="12.005">
    <polygon points="0.106061,8 6.00808,10.0545 10.0303,13.9576 12.1136,19.9872 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1732" duration="200"/>
   <frame tileid="1742" duration="200"/>
   <frame tileid="1737" duration="200"/>
   <frame tileid="1742" duration="200"/>
  </animation>
 </tile>
 <tile id="1733">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1735">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.181818" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1736">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.106061,8 -6.00808,10.0545 -10.0303,13.9576 -12.1136,19.9872 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1737">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.100316" y="12.005">
    <polygon points="0.106061,8 6.00808,10.0545 10.0303,13.9576 12.1136,19.9872 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1738">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1740">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.181818" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1741">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.106061,8 -6.00808,10.0545 -10.0303,13.9576 -12.1136,19.9872 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1742">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.100316" y="12.005">
    <polygon points="0.106061,8 6.00808,10.0545 10.0303,13.9576 12.1136,19.9872 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1743">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="11.9091">
    <polygon points="0,3.81818 -4.81818,6 -10.3636,9.81818 -14.0909,15.8182 -16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1744">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="16" width="31.875" height="15.75"/>
  </objectgroup>
 </tile>
 <tile id="1745">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0909091" y="12">
    <polygon points="0,3.81818 4.81818,6 10.3636,9.81818 14.0909,15.8182 16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1746">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="20.0435">
    <polygon points="-0.193017,-3.95652 -7.66025,-6.09802 -14.1173,-12.088 -15.9397,-20.0307 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1747" type="above"/>
 <tile id="1748" type="above"/>
 <tile id="1749" type="above"/>
 <tile id="1751">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1753" type="above"/>
 <tile id="1754" type="above"/>
 <tile id="1755" type="above"/>
 <tile id="1756" type="above"/>
 <tile id="1757" type="above"/>
 <tile id="1758" type="above"/>
 <tile id="1759" type="above"/>
 <tile id="1760" type="above"/>
 <tile id="1761" type="above"/>
 <tile id="1762" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="16" y="0.125" width="16" height="31.875">
    <polygon points="0,0 2.125,0 2.25,6.625 16,6.5625 16,31.875 0,31.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1763" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Platform" type="wall" x="0" y="6.75" width="32" height="25.25"/>
  </objectgroup>
 </tile>
 <tile id="1764" type="stone">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Platform" type="wall" x="16" y="0.125" width="16" height="31.875">
    <polygon points="0,0 -2.125,0 -2.25,6.625 -16,6.5625 -16,31.875 0,31.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1765" type="stone"/>
 <tile id="1766" type="stone"/>
 <tile id="1788" type="stone"/>
 <tile id="1789" type="stone"/>
 <tile id="1790" type="stone"/>
 <tile id="1791" type="stone"/>
 <tile id="1792">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
  </objectgroup>
  <animation>
   <frame tileid="1792" duration="200"/>
   <frame tileid="1802" duration="200"/>
   <frame tileid="1797" duration="200"/>
   <frame tileid="1802" duration="200"/>
  </animation>
 </tile>
 <tile id="1793">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1794">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0909091" y="0.0909091" width="19.9091" height="32"/>
  </objectgroup>
  <animation>
   <frame tileid="1794" duration="200"/>
   <frame tileid="1804" duration="200"/>
   <frame tileid="1799" duration="200"/>
   <frame tileid="1804" duration="200"/>
  </animation>
 </tile>
 <tile id="1795">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="-0.106061,-8 -6.00808,-10.0545 -10.0303,-13.9576 -12.1136,-19.9872 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1795" duration="200"/>
   <frame tileid="1805" duration="200"/>
   <frame tileid="1800" duration="200"/>
   <frame tileid="1805" duration="200"/>
  </animation>
 </tile>
 <tile id="1796">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="-0.100316" y="20">
    <polygon points="0.106061,-8 6.00808,-10.0545 10.0303,-13.9576 12.1136,-19.9872 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1796" duration="200"/>
   <frame tileid="1806" duration="200"/>
   <frame tileid="1801" duration="200"/>
   <frame tileid="1806" duration="200"/>
  </animation>
 </tile>
 <tile id="1797">
  <objectgroup>
   <object id="1" name="Water" type="water" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1799">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0909091" y="0.0909091" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1800">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="-0.106061,-8 -6.00808,-10.0545 -10.0303,-13.9576 -12.1136,-19.9872 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1801">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.100316" y="20">
    <polygon points="0.106061,-8 6.00808,-10.0545 10.0303,-13.9576 12.1136,-19.9872 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1802">
  <objectgroup>
   <object id="1" name="Water" type="water" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1804">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0909091" y="0.0909091" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="1805">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="-0.106061,-8 -6.00808,-10.0545 -10.0303,-13.9576 -12.1136,-19.9872 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1806">
  <objectgroup>
   <object id="1" name="Water" type="water" x="-0.100316" y="20">
    <polygon points="0.106061,-8 6.00808,-10.0545 10.0303,-13.9576 12.1136,-19.9872 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1807">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="16.125" y="0" width="16" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="1808">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1809">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0" width="16" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="1810">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.193017,3.95652 -7.66025,6.09802 -14.1173,12.088 -15.9397,20.0307 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1811" type="above"/>
 <tile id="1812" type="above"/>
 <tile id="1813" type="above"/>
 <tile id="1814" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="4.8125" y="-0.3125">
    <polygon points="0.125,3.1875 -1,10.1875 8.5625,13.625 19.25,12.4375 23.25,8.1875 23.1875,6.1875 20.0625,0.1875 3.125,0.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1815" type="above"/>
 <tile id="1816" type="above"/>
 <tile id="1817" type="above"/>
 <tile id="1818" type="above"/>
 <tile id="1819" type="above"/>
 <tile id="1820" type="above"/>
 <tile id="1821" type="above"/>
 <tile id="1822" type="above"/>
 <tile id="1823" type="above"/>
 <tile id="1824" type="above"/>
 <tile id="1825" type="above"/>
 <tile id="1826" type="above"/>
 <tile id="1827" type="above"/>
 <tile id="1852" type="stone"/>
 <tile id="1853" type="stone"/>
 <tile id="1854" type="stone"/>
 <tile id="1855" type="stone"/>
 <tile id="1856">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1856" duration="200"/>
   <frame tileid="1866" duration="200"/>
   <frame tileid="1861" duration="200"/>
   <frame tileid="1866" duration="200"/>
  </animation>
 </tile>
 <tile id="1857">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0.0909091" y="0" width="32" height="19.9091"/>
  </objectgroup>
  <animation>
   <frame tileid="1857" duration="200"/>
   <frame tileid="1867" duration="200"/>
   <frame tileid="1862" duration="200"/>
   <frame tileid="1867" duration="200"/>
  </animation>
 </tile>
 <tile id="1858">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water" x="0" y="20">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1858" duration="200"/>
   <frame tileid="1868" duration="200"/>
   <frame tileid="1863" duration="200"/>
   <frame tileid="1868" duration="200"/>
  </animation>
 </tile>
 <tile id="1861">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1862">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0909091" y="0" width="32" height="19.9091"/>
  </objectgroup>
 </tile>
 <tile id="1863">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="20">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1866">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="20">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1867">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0.0909091" y="0" width="32" height="19.9091"/>
  </objectgroup>
 </tile>
 <tile id="1868">
  <objectgroup>
   <object id="1" name="Water" type="water" x="0" y="20">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1871">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="19.9091">
    <polygon points="0,-3.81818 -4.81818,-6 -10.3636,-9.81818 -14.0909,-15.8182 -16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1872">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0.125" width="31.875" height="15.75"/>
  </objectgroup>
 </tile>
 <tile id="1873">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="5.32907e-15" y="20">
    <polygon points="0,-3.81818 4.81818,-6 10.3636,-9.81818 14.0909,-15.8182 16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1874">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="20.0435">
    <polygon points="-0.193017,-3.95652 -7.66025,-6.09802 -14.1173,-12.088 -15.9397,-20.0307 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1875" type="above"/>
 <tile id="1876" type="above">
  <animation>
   <frame tileid="1876" duration="200"/>
   <frame tileid="1885" duration="200"/>
  </animation>
 </tile>
 <tile id="1877" type="above">
  <animation>
   <frame tileid="1877" duration="200"/>
   <frame tileid="1886" duration="200"/>
  </animation>
 </tile>
 <tile id="1878" type="above"/>
 <tile id="1879" type="above"/>
 <tile id="1880" type="above"/>
 <tile id="1881" type="above"/>
 <tile id="1882" type="above"/>
 <tile id="1883" type="above"/>
 <tile id="1884" type="above"/>
 <tile id="1885" type="above"/>
 <tile id="1886" type="above"/>
 <tile id="1887" type="above"/>
 <tile id="1888" type="above"/>
 <tile id="1889" type="above"/>
 <tile id="1890" type="above"/>
 <tile id="1891" type="above"/>
 <tile id="1920">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1920" duration="200"/>
   <frame tileid="1930" duration="200"/>
   <frame tileid="1925" duration="200"/>
   <frame tileid="1930" duration="200"/>
  </animation>
 </tile>
 <tile id="1921">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
  <animation>
   <frame tileid="1921" duration="200"/>
   <frame tileid="1931" duration="200"/>
   <frame tileid="1926" duration="200"/>
   <frame tileid="1931" duration="200"/>
  </animation>
 </tile>
 <tile id="1922">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1922" duration="200"/>
   <frame tileid="1932" duration="200"/>
   <frame tileid="1927" duration="200"/>
   <frame tileid="1932" duration="200"/>
  </animation>
 </tile>
 <tile id="1923">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1923" duration="200"/>
   <frame tileid="1933" duration="200"/>
   <frame tileid="1928" duration="200"/>
   <frame tileid="1933" duration="200"/>
  </animation>
 </tile>
 <tile id="1924">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1924" duration="200"/>
   <frame tileid="1934" duration="200"/>
   <frame tileid="1929" duration="200"/>
   <frame tileid="1934" duration="200"/>
  </animation>
 </tile>
 <tile id="1925">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1926">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="1927">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1928">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1929">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1930">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1931">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="1932">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1933">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1934">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1935">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="11.9091">
    <polygon points="0,3.81818 -4.81818,6 -10.3636,9.81818 -14.0909,15.8182 -16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1936">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="16" width="31.875" height="15.75"/>
  </objectgroup>
 </tile>
 <tile id="1937">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0909091" y="12">
    <polygon points="0,3.81818 4.81818,6 10.3636,9.81818 14.0909,15.8182 16.3636,19.9091 0,19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1938">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="12.005">
    <polygon points="0.193017,3.95652 7.66025,6.09802 14.1173,12.088 15.9397,20.0307 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1938" duration="200"/>
   <frame tileid="2194" duration="200"/>
   <frame tileid="2066" duration="200"/>
   <frame tileid="2194" duration="200"/>
  </animation>
 </tile>
 <tile id="1939" type="above">
  <animation>
   <frame tileid="1939" duration="200"/>
   <frame tileid="1948" duration="200"/>
  </animation>
 </tile>
 <tile id="1940" type="above">
  <animation>
   <frame tileid="1940" duration="200"/>
   <frame tileid="1949" duration="200"/>
  </animation>
 </tile>
 <tile id="1941" type="above">
  <animation>
   <frame tileid="1941" duration="200"/>
   <frame tileid="1950" duration="200"/>
  </animation>
 </tile>
 <tile id="1942" type="above"/>
 <tile id="1943" type="above">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1944" type="above"/>
 <tile id="1945" type="above"/>
 <tile id="1946" type="above"/>
 <tile id="1947" type="above"/>
 <tile id="1948" type="above"/>
 <tile id="1949" type="above"/>
 <tile id="1950" type="above"/>
 <tile id="1951" type="above"/>
 <tile id="1952" type="above"/>
 <tile id="1953" type="above"/>
 <tile id="1954" type="above"/>
 <tile id="1955" type="above"/>
 <tile id="1984">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="0" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
  <animation>
   <frame tileid="1984" duration="200"/>
   <frame tileid="1994" duration="200"/>
   <frame tileid="1989" duration="200"/>
   <frame tileid="1994" duration="200"/>
  </animation>
 </tile>
 <tile id="1985">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1986">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
  <animation>
   <frame tileid="1986" duration="200"/>
   <frame tileid="1996" duration="200"/>
   <frame tileid="1991" duration="200"/>
   <frame tileid="1996" duration="200"/>
  </animation>
 </tile>
 <tile id="1987">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1987" duration="200"/>
   <frame tileid="1997" duration="200"/>
   <frame tileid="1992" duration="200"/>
   <frame tileid="1997" duration="200"/>
  </animation>
 </tile>
 <tile id="1988">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="1988" duration="200"/>
   <frame tileid="1998" duration="200"/>
   <frame tileid="1993" duration="200"/>
   <frame tileid="1998" duration="200"/>
  </animation>
 </tile>
 <tile id="1989">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="0" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="1991">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="1992">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1993">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1994">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="0" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="1996">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Water" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="1997">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1998">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="1999">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="16.125" y="0" width="16" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="2000">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2001">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0" width="16" height="31.75"/>
  </objectgroup>
 </tile>
 <tile id="2002">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="20.0435">
    <polygon points="0.193017,-3.95652 7.66025,-6.09802 14.1173,-12.088 15.9397,-20.0307 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2002" duration="200"/>
   <frame tileid="2258" duration="200"/>
   <frame tileid="2130" duration="200"/>
   <frame tileid="2258" duration="200"/>
  </animation>
 </tile>
 <tile id="2003" type="above">
  <animation>
   <frame tileid="2003" duration="200"/>
   <frame tileid="2012" duration="200"/>
  </animation>
 </tile>
 <tile id="2004" type="above">
  <animation>
   <frame tileid="2004" duration="200"/>
   <frame tileid="2013" duration="200"/>
  </animation>
 </tile>
 <tile id="2005" type="above">
  <animation>
   <frame tileid="2005" duration="200"/>
   <frame tileid="2014" duration="200"/>
  </animation>
 </tile>
 <tile id="2006">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="28" y="-0.125">
    <polygon points="0,0 -0.125,2.5 1.875,6 -2.0625,9.125 -2.0625,11.9375 4,12 4,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2007">
  <objectgroup>
   <object id="1" name="Collision" type="truck" x="-0.125" y="0">
    <polygon points="0,0 32.0625,-0.0625 32.0625,4.9375 29.1875,7.125 29.25,9.8125 29.9375,10.25 32.25,14.1875 32.1875,19.9375 30.125,20 27.3125,17 22.1875,15.9375 17.25,15 12.6875,15.0625 10,17.125 6.1875,20 2.0625,20.0625 0.125,17.8125 0.1875,16 2.125,13.9375 2.125,11.875 0,10.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2008">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="-0.125" y="-0.25">
    <polygon points="0,0 5.3125,2.25 0.1875,7.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2009" type="above"/>
 <tile id="2010" type="above"/>
 <tile id="2011" type="above"/>
 <tile id="2012" type="above"/>
 <tile id="2013" type="above"/>
 <tile id="2014" type="above"/>
 <tile id="2015" type="above"/>
 <tile id="2016" type="above"/>
 <tile id="2017" type="above"/>
 <tile id="2048">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2048" duration="200"/>
   <frame tileid="2058" duration="200"/>
   <frame tileid="2053" duration="200"/>
   <frame tileid="2058" duration="200"/>
  </animation>
 </tile>
 <tile id="2049">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
  <animation>
   <frame tileid="2049" duration="200"/>
   <frame tileid="2059" duration="200"/>
   <frame tileid="2054" duration="200"/>
   <frame tileid="2059" duration="200"/>
  </animation>
 </tile>
 <tile id="2050">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2050" duration="200"/>
   <frame tileid="2060" duration="200"/>
   <frame tileid="2055" duration="200"/>
   <frame tileid="2060" duration="200"/>
  </animation>
 </tile>
 <tile id="2053">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2054">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2055">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2058">
  <objectgroup>
   <object id="1" name="Water" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2059">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="Water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2060">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Water" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2063">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="19.9091">
    <polygon points="0,-3.81818 -4.81818,-6 -10.3636,-9.81818 -14.0909,-15.8182 -16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2064">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="0.125" width="31.875" height="15.75"/>
  </objectgroup>
 </tile>
 <tile id="2065">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="5.32907e-15" y="20">
    <polygon points="0,-3.81818 4.81818,-6 10.3636,-9.81818 14.0909,-15.8182 16.3636,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2066">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="12.005">
    <polygon points="0.193017,3.95652 7.66025,6.09802 14.1173,12.088 15.9397,20.0307 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2080" type="above"/>
 <tile id="2112">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.0625,1.625 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13.0625,23.25 -16.2813,23.2813 -15.8125,17.875 -15.875,14.4375 -13.3125,11.625 -11.125,7 -6.8125,5.625 -3.125,2.75 -2.75,1.4375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.25 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13,23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2112" duration="200"/>
   <frame tileid="2624" duration="200"/>
  </animation>
 </tile>
 <tile id="2113">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2113" duration="200"/>
   <frame tileid="2625" duration="200"/>
  </animation>
 </tile>
 <tile id="2114">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,2.6875 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 17.5938,23.1563 16.625,17.5 16.75,11.375 12.875,10.5 11.125,7 7.125,5.25 4.75,2.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2114" duration="200"/>
   <frame tileid="2626" duration="200"/>
  </animation>
 </tile>
 <tile id="2115">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0,0 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25 -19.6875,23.1875 -19.0625,20.625 -15.8125,17.875 -15.4375,14.875 -12.4375,12.75 -11.125,7 -6.3125,6.75 -3.125,2.75 -1.4375,0.1875"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2115" duration="200"/>
   <frame tileid="2627" duration="200"/>
  </animation>
 </tile>
 <tile id="2116">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2116" duration="200"/>
   <frame tileid="2628" duration="200"/>
  </animation>
 </tile>
 <tile id="2117">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,1.375 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 21.3438,23.1563 18.0625,17.25 16.75,11.375 12.875,10.5 11.0625,8.625 10.8125,4 4.75,2.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2117" duration="200"/>
   <frame tileid="2629" duration="200"/>
  </animation>
 </tile>
 <tile id="2118">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -12.875,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2118" duration="200"/>
   <frame tileid="2630" duration="200"/>
  </animation>
 </tile>
 <tile id="2119">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="16.25" width="32.0625" height="15.75"/>
  </objectgroup>
  <animation>
   <frame tileid="2119" duration="200"/>
   <frame tileid="2631" duration="200"/>
  </animation>
 </tile>
 <tile id="2120">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.125" y="8.8125">
    <polygon points="0,23.1875 -0.1875,9.5625 2.8125,9.6875 6.5,13.25 8.625,14.5 11.75,18.625 12.875,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2120" duration="200"/>
   <frame tileid="2632" duration="200"/>
  </animation>
 </tile>
 <tile id="2121">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.125,6.8125 0,14.375 -5.6875,16.75 -7.75,19 -10.5,20.75 -13.0625,23.375 -15.1875,23.25 -14.75,16.375 -8,13.125 -6.8125,8.1875 -3.625,8.25"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,14.4375 -5.625,16.8125 -7.5625,19 -10.625,21.0625 -12.8125,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2121" duration="200"/>
   <frame tileid="2633" duration="200"/>
  </animation>
 </tile>
 <tile id="2122">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.1875" y="14.75" width="32" height="7.4375"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="22.0625" width="32.0625" height="9.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="2122" duration="200"/>
   <frame tileid="2634" duration="200"/>
  </animation>
 </tile>
 <tile id="2123">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.125" y="8.75">
    <polygon points="-0.125,6.8125 0,14.375 5.6875,16.75 7.75,19 10.5,20.75 13.0625,23.375 15.1875,23.25 14.75,16.375 8,13.125 6.8125,8.1875 3.625,8.25"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="8.75">
    <polygon points="0,23.1875 -0.0625,14.4375 5.625,16.8125 7.5625,19 10.625,21.0625 12.8125,23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2123" duration="200"/>
   <frame tileid="2635" duration="200"/>
  </animation>
 </tile>
 <tile id="2124">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2124" duration="200"/>
   <frame tileid="2126" duration="200"/>
  </animation>
 </tile>
 <tile id="2125">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2125" duration="200"/>
   <frame tileid="2127" duration="200"/>
  </animation>
 </tile>
 <tile id="2126">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2124" duration="200"/>
   <frame tileid="2126" duration="200"/>
  </animation>
 </tile>
 <tile id="2127">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2125" duration="200"/>
   <frame tileid="2127" duration="200"/>
  </animation>
 </tile>
 <tile id="2128">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="2128" duration="200"/>
   <frame tileid="2256" duration="200"/>
  </animation>
 </tile>
 <tile id="2129">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="2129" duration="200"/>
   <frame tileid="2257" duration="200"/>
  </animation>
 </tile>
 <tile id="2130">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="20.0435">
    <polygon points="0.193017,-3.95652 7.66025,-6.09802 14.1173,-12.088 15.9397,-20.0307 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2144">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="2.9375" y="20.875">
    <polygon points="0,0 24.125,0.125 24.0625,6.625 24.8125,6.9375 25.125,8.75 27.1875,9.125 28.3125,11.125 -2.9375,11.0625 -2.9375,10 -1.875,7.9375 -0.0625,6.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2176">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2176" duration="200"/>
   <frame tileid="2688" duration="200"/>
  </animation>
 </tile>
 <tile id="2178">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2178" duration="200"/>
   <frame tileid="2690" duration="200"/>
  </animation>
 </tile>
 <tile id="2179">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2179" duration="200"/>
   <frame tileid="2691" duration="200"/>
  </animation>
 </tile>
 <tile id="2181">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2181" duration="200"/>
   <frame tileid="2693" duration="200"/>
  </animation>
 </tile>
 <tile id="2182">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Melted Ice" type="water" x="17.0625" y="-0.0625" width="14.875" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2182" duration="200"/>
   <frame tileid="2694" duration="200"/>
  </animation>
 </tile>
 <tile id="2183">
  <animation>
   <frame tileid="2183" duration="200"/>
   <frame tileid="2695" duration="200"/>
  </animation>
 </tile>
 <tile id="2184">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="16" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2184" duration="200"/>
   <frame tileid="2696" duration="200"/>
  </animation>
 </tile>
 <tile id="2185">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2185" duration="200"/>
   <frame tileid="2697" duration="200"/>
  </animation>
 </tile>
 <tile id="2186">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2186" duration="200"/>
   <frame tileid="2698" duration="200"/>
  </animation>
 </tile>
 <tile id="2187">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2699" duration="200"/>
  </animation>
 </tile>
 <tile id="2188">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2188" duration="200"/>
   <frame tileid="2190" duration="200"/>
  </animation>
 </tile>
 <tile id="2189">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2189" duration="200"/>
   <frame tileid="2191" duration="200"/>
  </animation>
 </tile>
 <tile id="2190">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2188" duration="200"/>
   <frame tileid="2190" duration="200"/>
  </animation>
 </tile>
 <tile id="2191">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
  <animation>
   <frame tileid="2189" duration="200"/>
   <frame tileid="2191" duration="200"/>
  </animation>
 </tile>
 <tile id="2192">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 31.875,6.875 16.4375,7.375 12.25,9.84375 5.375,11.875 0,11.9375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.0625,4.125 5.3125,3.90625 12.5938,1.92188 16.7031,-0.601563 32.0625,-0.9375 32.0625,14.125 0,14.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2192" duration="200"/>
   <frame tileid="2320" duration="200"/>
  </animation>
 </tile>
 <tile id="2193">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.125,-1.875 10.3438,1.1875 15.7969,-1.8125 21.1797,-1.8125 23.4023,2.875 32.125,2.9375 32.0625,14.125 0,14.125"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 32.0625,10.8594 23.1875,10.7539 21.375,6.23242 15.8125,6.14844 10.3125,9.125 0.125,6"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2193" duration="200"/>
   <frame tileid="2321" duration="200"/>
  </animation>
 </tile>
 <tile id="2194">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="12.005">
    <polygon points="0.193017,3.95652 7.66025,6.09802 14.1173,12.088 15.9397,20.0307 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2207">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="28" y="-0.125">
    <polygon points="0,0 -0.125,2.5 1.875,6 -2.0625,9.125 -2.0625,11.9375 4,12 4,0.0625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2208">
  <objectgroup>
   <object id="1" name="Collision" type="truck" x="-0.125" y="0">
    <polygon points="0,0 32.0625,-0.0625 32.0625,4.9375 29.1875,7.125 29.25,9.8125 29.9375,10.25 32.25,14.1875 32.1875,19.9375 30.125,20 27.3125,17 22.1875,15.9375 17.25,15 12.6875,15.0625 10,17.125 6.1875,20 2.0625,20.0625 0.125,17.8125 0.1875,16 2.125,13.9375 2.125,11.875 0,10.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2209">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="-0.125" y="-0.25">
    <polygon points="0,0 5.3125,2.25 0.1875,7.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2240">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="31.875" y="23.4063">
    <polygon points="0.0625,-7.0625 0.1875,-9.75 -5.1875,-10.3125 -9,-16.1875 -11.875,-17.9375 -13.875,-20.3125 -13.9375,-23.375 -16.2813,-23.2813 -15.8125,-17.875 -13.3125,-14.5 -10.5,-12.6875 -7.875,-9.9375 -4.8125,-7.3125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.875" y="23.4063">
    <polygon points="0,-23.3125 0.0625,-9.6875 -5.1875,-10.1563 -7.3125,-12.9375 -9.125,-16.25 -11.9375,-18 -13.8125,-20.4375 -13.875,-23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2240" duration="200"/>
   <frame tileid="2752" duration="200"/>
  </animation>
 </tile>
 <tile id="2241">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="2241" duration="200"/>
   <frame tileid="2753" duration="200"/>
  </animation>
 </tile>
 <tile id="2242">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="-0.09375" y="23.2188">
    <polygon points="0.125,-6.125 0.0625,-7.9375 6.1875,-10.1875 9.8125,-14 10,-16.1875 12.9375,-17.5 13.0625,-23.25 16.2813,-23.2813 16,-17.875 14.5625,-14.75 11.8125,-11.625 9.25,-9.9375 6.8125,-6.875 3.8125,-5.9375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.09375" y="23.2188">
    <polygon points="0,-23.25 0.125,-7.9375 6.1875,-10.1875 10,-14.125 10.1875,-16.3125 13.0625,-17.5625 13,-23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2242" duration="200"/>
   <frame tileid="2754" duration="200"/>
  </animation>
 </tile>
 <tile id="2243">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="23.25">
    <polygon points="0,-4.5625 0.0625,-7.375 -6.125,-9.1875 -9.125,-15.25 -12.875,-17.375 -14.625,-19.75 -15.6875,-23.125 -19.4688,-23.1563 -17.5,-19 -15.375,-16.625 -13.3125,-14 -10.375,-11.5 -8.1875,-8.1875 -3.9375,-5.375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="23.25">
    <polygon points="0,-23.25 0.0625,-7.375 -6,-9.1875 -9.125,-15.125 -12.8125,-17.3125 -14.5625,-19.625 -15.6875,-23.1875"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2243" duration="200"/>
   <frame tileid="2755" duration="200"/>
  </animation>
 </tile>
 <tile id="2244">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
  <animation>
   <frame tileid="2244" duration="200"/>
   <frame tileid="2756" duration="200"/>
  </animation>
 </tile>
 <tile id="2245">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.09375" y="23.1875">
    <polygon points="0,-23.25 -0.0625,-7.375 6,-9.1875 11.6875,-12.3125 12.75,-18.9375 14.5625,-20.3125 15.6875,-23.1875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0.09375" y="23.1875">
    <polygon points="0,-5.1875 -0.0625,-7.375 6.125,-9.1875 11.6875,-12.4375 12.625,-18.875 14.6875,-20.375 15.6875,-23.125 21.3438,-23.1563 17.375,-17.625 15.125,-14.9375 13.75,-11.0625 9.9375,-9.125 8.4375,-5.375 3.5,-4.625"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2245" duration="200"/>
   <frame tileid="2757" duration="200"/>
  </animation>
 </tile>
 <tile id="2246">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="31.75" y="23.375">
    <polygon points="0.1875,-23.25 0.125,-11.5625 -3,-11.75 -6.5,-13.25 -8.625,-14.5 -11.75,-18.625 -12.875,-23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2246" duration="200"/>
   <frame tileid="2758" duration="200"/>
  </animation>
 </tile>
 <tile id="2247">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="15.5"/>
  </objectgroup>
  <animation>
   <frame tileid="2247" duration="200"/>
   <frame tileid="2759" duration="200"/>
  </animation>
 </tile>
 <tile id="2248">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0.125" y="23.25">
    <polygon points="0,-23.1875 -0.1875,-9.5625 2.8125,-9.6875 6.5,-13.25 8.625,-14.5 11.75,-18.625 12.875,-23.3125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2248" duration="200"/>
   <frame tileid="2760" duration="200"/>
  </animation>
 </tile>
 <tile id="2249">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,14.9375 5.625,14.9375 5.5,12.25 3.0625,8.9375 -0.75,7.75 -1.5625,6.75 -2.75,2.6875 -2.625,-0.125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,-0.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2249" duration="200"/>
   <frame tileid="2761" duration="200"/>
  </animation>
 </tile>
 <tile id="2250">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="11.375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="11.375" width="32.125" height="7.5"/>
  </objectgroup>
  <animation>
   <frame tileid="2250" duration="200"/>
   <frame tileid="2762" duration="200"/>
  </animation>
 </tile>
 <tile id="2251">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="0" y="23.1875">
    <polygon points="-0.125,-6.8125 0.0625,-12.25 5.25,-13.3125 7.9375,-15.6875 8.1875,-18.125 12.4375,-23.375 15.1875,-23.25 14.75,-16.375 8,-13.125 6.8125,-8.1875 3.625,-8.25"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="0" y="23.1875">
    <polygon points="0,-23.1875 0.0625,-12.3125 5.3125,-13.375 7.9375,-15.75 8.25,-18.1875 12.3125,-23.25"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2251" duration="200"/>
   <frame tileid="2763" duration="200"/>
  </animation>
 </tile>
 <tile id="2252">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="2253">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="2254">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="2255">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="2256">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="2257">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
  </objectgroup>
 </tile>
 <tile id="2258">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.100316" y="20.0435">
    <polygon points="0.193017,-3.95652 7.66025,-6.09802 14.1173,-12.088 15.9397,-20.0307 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2260">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="4.8125" y="-0.3125">
    <polygon points="0.125,3.1875 -1,10.1875 8.5625,13.625 19.25,12.4375 23.25,8.1875 23.1875,6.1875 20.0625,0.1875 3.125,0.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2269">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="4.8125" y="-0.3125">
    <polygon points="0.125,3.1875 -1,10.1875 8.5625,13.625 19.25,12.4375 23.25,8.1875 23.1875,6.1875 20.0625,0.1875 3.125,0.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2271" type="above"/>
 <tile id="2304">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2304" duration="200"/>
   <frame tileid="2312" duration="200"/>
  </animation>
 </tile>
 <tile id="2305">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -3.125,-0.125 -4.5,-4.6875 -8.125,-8.1875 -12.5625,-11.6875 -17.9375,-13.3125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2305" duration="200"/>
   <frame tileid="2313" duration="200"/>
  </animation>
 </tile>
 <tile id="2306">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2306" duration="200"/>
   <frame tileid="2314" duration="200"/>
  </animation>
 </tile>
 <tile id="2307">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="-1.8125,0 -6.5,0 -6.625,-3.375 -9.5,-7 -12.8125,-11.3125 -17.9375,-13.3125 -17.9375,-16.375 -13.125,-16 -10.3125,-13.3125 -9.6875,-9.5625 -8.4375,-8.0625 -4.6875,-8.1875 -2.0625,-4.875"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0.0625,0.625 4.9375,0.9375 7.8125,3.5625 8.3125,7.5625 9.6875,8.8125 13.4375,8.875 16,12 16.3125,16.9375 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2307" duration="200"/>
   <frame tileid="2315" duration="200"/>
  </animation>
 </tile>
 <tile id="2308">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -11.5625,9.5 -12.6875,13.3125 -13.5,16.875 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2308" duration="200"/>
   <frame tileid="2316" duration="200"/>
  </animation>
 </tile>
 <tile id="2309">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="-0.109375" y="14.9375">
    <polygon points="0,0 5.375,3 9.3125,4.5625 12.1875,5.0625 15.8125,7.3125 16.75,10.3125 17,17.0625 32.0391,17.0703 32.1406,-14.9219 -0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2309" duration="200"/>
   <frame tileid="2317" duration="200"/>
  </animation>
 </tile>
 <tile id="2310">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -7.9375,17 -7.60156,12.0078 -4.70313,10.4531 0.03125,8.09375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2310" duration="200"/>
   <frame tileid="2318" duration="200"/>
  </animation>
 </tile>
 <tile id="2311">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -9.875,0 -10.4375,-4.75 -13.3125,-7.0625 -17.9375,-9.125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2311" duration="200"/>
   <frame tileid="2319" duration="200"/>
  </animation>
 </tile>
 <tile id="2312">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2313">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -3.125,-0.125 -4.5,-4.6875 -8.125,-8.1875 -12.5625,-11.6875 -17.9375,-13.3125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2314">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -11,17.0625 -10.2266,10.9453 -5.76563,8.14063 0.03125,3.84375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2315">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="-1.8125,0 -6.5,0 -6.625,-3.375 -9.5,-7 -12.8125,-11.3125 -17.9375,-13.3125 -17.9375,-16.375 -13.125,-16 -10.3125,-13.3125 -9.6875,-9.5625 -8.4375,-8.0625 -4.6875,-8.1875 -2.0625,-4.875"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0.0625,0.625 4.9375,0.9375 7.8125,3.5625 8.3125,7.5625 9.6875,8.8125 13.4375,8.875 16,12 16.3125,16.9375 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2316">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -11.5625,9.5 -12.6875,13.3125 -13.5,16.875 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2317">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.109375" y="14.9375">
    <polygon points="0,0 5.375,3 9.3125,4.5625 12.1875,5.0625 15.8125,7.3125 16.75,10.3125 17,17.0625 32.0391,17.0703 32.1406,-14.9219 -0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2318">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -7.9375,17 -7.60156,12.0078 -4.70313,10.4531 0.03125,8.09375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="14.9375">
    <polygon points="0,0 -5.25,3.125 -8.8125,5.9375 -11,6.0625 -13.1875,8.125 -14,12.0625 -16.1875,17 -32.0391,17.0703 -32.1406,-14.9219 0.03125,-14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2319">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="17.9375" y="32">
    <polygon points="0,0 -9.875,0 -10.4375,-4.75 -13.3125,-7.0625 -17.9375,-9.125 -18.0625,-16.8125 -11.8125,-15.6875 -9.625,-13.375 -6.375,-12.875 -5.875,-10.6875 -1.8125,-10.125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="15.0625">
    <polygon points="0,0 6.25,1.25 8.5625,3.6875 11.9375,4.125 12.3125,6.3125 16.4375,6.9375 17.0625,10.4375 18.125,16.875 32.0938,16.9063 32.0625,-15.0625 0.03125,-15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2320">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 31.875,6.875 16.4375,7.375 12.25,9.84375 5.375,11.875 0,11.9375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.0625,4.125 5.3125,3.90625 12.5938,1.92188 16.7031,-0.601563 32.0625,-0.9375 32.0625,14.125 0,14.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2321">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125">
    <polygon points="0.125,-1.875 10.3438,1.1875 15.7969,-1.8125 21.1797,-1.8125 23.4023,2.875 32.125,2.9375 32.0625,14.125 0,14.125"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875">
    <polygon points="0,0 32,0 32.0625,10.8594 23.1875,10.7539 21.375,6.23242 15.8125,6.14844 10.3125,9.125 0.125,6"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2325">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="4.8125" y="-0.3125">
    <polygon points="0.125,3.1875 -1,10.1875 8.5625,13.625 19.25,12.4375 23.25,8.1875 23.1875,6.1875 20.0625,0.1875 3.125,0.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2338">
  <objectgroup>
   <object id="1" name="Collision" type="trunk" x="4.8125" y="-0.3125">
    <polygon points="0.125,3.1875 -1,10.1875 8.5625,13.625 19.25,12.4375 23.25,8.1875 23.1875,6.1875 20.0625,0.1875 3.125,0.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2368">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -5.75,0.125 -7.75,-0.9375 -9,-3 -12.5,-2.9375 -14.9375,-4.9375 -16.1875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.8125,0 4.0625,0.125 4.5,4.6875 8.125,8.1875 12.5625,11.6875 17.9375,13.3125 18.0625,16.9375 12.3125,17.0625 10.1875,15.875 9.0625,13.9375 5.5,14 3.25,12.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2368" duration="200"/>
   <frame tileid="2376" duration="200"/>
  </animation>
 </tile>
 <tile id="2369">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.8125,1.0625 10.4375,-1.3125 11.9375,-4.125 12.3125,-6.3125 15.1875,-7.9375 15.75,-11.625 17.4375,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-0.5,0 -3.125,0.125 -4.5,4.6875 -8.125,8.1875 -12.5625,11.6875 -17.9375,13.3125 -18.0625,16.8125 -11.0625,18 -7.5625,15.6875 -5.625,10.6875 -2.875,8.9375 -2.25,5.125"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2369" duration="200"/>
   <frame tileid="2377" duration="200"/>
  </animation>
 </tile>
 <tile id="2370">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.9375" y="-0.03125">
    <polygon points="1.8125,0 9.125,0 8.9375,2.3125 5.25,6.375 9.9375,11.125 17.9375,11 17.9375,16.375 14.625,18 10.0625,17 8.875,14.6875 5.0625,13.9375 3.3125,9.375 2.75,4.625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="16.9063">
    <polygon points="-0.0625,-0.625 -3.375,1.0625 -8.0625,0.0625 -9.3125,-2.25 -13,-3.125 -14.75,-7.5 -15.25,-12.5 -16.3125,-16.8125 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2370" duration="200"/>
   <frame tileid="2378" duration="200"/>
  </animation>
 </tile>
 <tile id="2371">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-1.8125,0 -8.3125,0 -8.9375,3.4375 -8.8125,8.8125 -9.9375,11.125 -17.9375,11 -17.9375,16.375 -14.625,18 -10.0625,17 -6.9375,15.3125 -5.8125,11.1875 -3.3125,9.375 -2.75,4.625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0.0625,-0.625 3.375,1.0625 8.0625,0.0625 11.125,-1.5625 12.1875,-5.8125 14.75,-7.5 15.25,-12.5 16.3125,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2371" duration="200"/>
   <frame tileid="2379" duration="200"/>
  </animation>
 </tile>
 <tile id="2372">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="32" y="17.0859">
    <polygon points="0.0625,-2.5 -5.25,-2.125 -9,-4.5 -11,-6.0625 -14,-5.0625 -14.875,-13 -14.375,-17.0625 -32.0391,-17.0703 -32.1406,14.9219 0.03125,14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2372" duration="200"/>
   <frame tileid="2380" duration="200"/>
  </animation>
 </tile>
 <tile id="2373">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Melted Ice" type="water" x="-0.109375" y="17.0859">
    <polygon points="0,0 5.5625,-3.9375 11,-3.3125 12.125,-6.3125 14,-11.8125 16.8125,-13.0625 17.125,-17.0625 32.0391,-17.0703 32.1406,14.9219 -0.03125,14.9063"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2373" duration="200"/>
   <frame tileid="2381" duration="200"/>
  </animation>
 </tile>
 <tile id="2374">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.125,0 9.875,0 10.4375,4.75 13.3125,7.0625 17.9375,9.125 18.0625,16.8125 11.8125,15.6875 11.9375,12.875 6.375,12.875 4.25,11.9375 3.6875,5.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -6.25,-1.25 -6.25,-4.0625 -11.5625,-4 -13.8125,-5 -14.3125,-11.1875 -16.875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2374" duration="200"/>
   <frame tileid="2382" duration="200"/>
  </animation>
 </tile>
 <tile id="2375">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.25,-1.25 8.5625,-3.6875 11.9375,-4.125 13.25,-5 13.5,-10.5 16.3125,-12.4375 18.125,-16.875 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="0,0 -9.875,0 -10.4375,4.75 -13.3125,7.0625 -17.9375,9.125 -18.0625,16.8125 -11.8125,15.6875 -9.625,13.375 -6.375,12.875 -4.9375,12.0625 -4.625,6.4375 -1.71875,4.5"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2375" duration="200"/>
   <frame tileid="2383" duration="200"/>
  </animation>
 </tile>
 <tile id="2376">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -5.75,0.125 -7.75,-0.9375 -9,-3 -12.5,-2.9375 -14.9375,-4.9375 -16.1875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.8125,0 4.0625,0.125 4.5,4.6875 8.125,8.1875 12.5625,11.6875 17.9375,13.3125 18.0625,16.9375 12.3125,17.0625 10.1875,15.875 9.0625,13.9375 5.5,14 3.25,12.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2377">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.8125,1.0625 10.4375,-1.3125 11.9375,-4.125 12.3125,-6.3125 15.1875,-7.9375 15.75,-11.625 17.4375,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-0.5,0 -3.125,0.125 -4.5,4.6875 -8.125,8.1875 -12.5625,11.6875 -17.9375,13.3125 -18.0625,16.8125 -11.0625,18 -7.5625,15.6875 -5.625,10.6875 -2.875,8.9375 -2.25,5.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2378">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.9375" y="-0.03125">
    <polygon points="1.8125,0 9.125,0 8.9375,2.3125 5.25,6.375 9.9375,11.125 17.9375,11 17.9375,16.375 14.625,18 10.0625,17 8.875,14.6875 5.0625,13.9375 3.3125,9.375 2.75,4.625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="16.9063">
    <polygon points="-0.0625,-0.625 -3.375,1.0625 -8.0625,0.0625 -9.3125,-2.25 -13,-3.125 -14.75,-7.5 -15.25,-12.5 -16.3125,-16.8125 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2379">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0.0625,-0.625 3.375,1.0625 8.0625,0.0625 11.125,-1.5625 12.1875,-5.8125 14.75,-7.5 15.25,-12.5 16.3125,-16.8125 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="-1.8125,0 -8.3125,0 -8.9375,3.4375 -8.8125,8.8125 -9.9375,11.125 -17.9375,11 -17.9375,16.375 -14.625,18 -10.0625,17 -6.9375,15.3125 -5.8125,11.1875 -3.3125,9.375 -2.75,4.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2380">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32" y="17.0859">
    <polygon points="0.0625,-2.5 -5.25,-2.125 -9,-4.5 -11,-6.0625 -14,-5.0625 -14.875,-13 -14.375,-17.0625 -32.0391,-17.0703 -32.1406,14.9219 0.03125,14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2381">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.109375" y="17.0859">
    <polygon points="0,0 5.5625,-3.9375 11,-3.3125 12.125,-6.3125 14,-11.8125 16.8125,-13.0625 17.125,-17.0625 32.0391,-17.0703 32.1406,14.9219 -0.03125,14.9063"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2382">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.9063" y="-0.03125">
    <polygon points="1.125,0 9.875,0 10.4375,4.75 13.3125,7.0625 17.9375,9.125 18.0625,16.8125 11.8125,15.6875 11.9375,12.875 6.375,12.875 4.25,11.9375 3.6875,5.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9688" y="16.9063">
    <polygon points="0,0 -6.25,-1.25 -6.25,-4.0625 -11.5625,-4 -13.8125,-5 -14.3125,-11.1875 -16.875,-16.875 -32.0938,-16.9063 -32.0625,15.0625 -0.03125,15.0938"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2383">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.125" y="16.9063">
    <polygon points="0,0 6.25,-1.25 8.5625,-3.6875 11.9375,-4.125 13.25,-5 13.5,-10.5 16.3125,-12.4375 18.125,-16.875 32.0938,-16.9063 32.0625,15.0625 0.03125,15.0938"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="17.9375" y="-0.03125">
    <polygon points="0,0 -9.875,0 -10.4375,4.75 -13.3125,7.0625 -17.9375,9.125 -18.0625,16.8125 -11.8125,15.6875 -9.625,13.375 -6.375,12.875 -4.9375,12.0625 -4.625,6.4375 -1.71875,4.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2432">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2432" duration="200"/>
   <frame tileid="2442" duration="200"/>
   <frame tileid="2437" duration="200"/>
   <frame tileid="2442" duration="200"/>
  </animation>
 </tile>
 <tile id="2433">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
  <animation>
   <frame tileid="2433" duration="200"/>
   <frame tileid="2443" duration="200"/>
   <frame tileid="2438" duration="200"/>
   <frame tileid="2443" duration="200"/>
  </animation>
 </tile>
 <tile id="2434">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2434" duration="200"/>
   <frame tileid="2444" duration="200"/>
   <frame tileid="2439" duration="200"/>
   <frame tileid="2444" duration="200"/>
  </animation>
 </tile>
 <tile id="2435">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2435" duration="200"/>
   <frame tileid="2445" duration="200"/>
   <frame tileid="2440" duration="200"/>
   <frame tileid="2445" duration="200"/>
  </animation>
 </tile>
 <tile id="2436">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2436" duration="200"/>
   <frame tileid="2446" duration="200"/>
   <frame tileid="2441" duration="200"/>
   <frame tileid="2446" duration="200"/>
  </animation>
 </tile>
 <tile id="2437">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2438">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2439">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2440">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2441">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2442">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="32.0909" y="11.9091">
    <polygon points="0,0 -6.09091,0 -14.1818,4.36364 -18.1818,10.0909 -20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0909" y="12.005">
    <polygon points="-0.0111989,-0.134387 -6.20571,-0.0837945 -14.2082,4.08801 -18.3012,10.0139 -20.2125,19.9398 -32.0909,19.9837 -32.0938,-11.9922 -0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2443">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="12.0909" width="32" height="19.9091"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="0" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2444">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="11.9091">
    <polygon points="0,0 6.09091,0 14.1818,4.36364 18.1818,10.0909 20.2727,19.9091 0,19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.00284091" y="12.005">
    <polygon points="0.0111989,-0.134387 6.20571,-0.0837945 14.2082,4.08801 18.3012,10.0139 20.2125,19.9398 32.0909,19.9837 32.0938,-11.9922 0.0974747,-11.9889"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2445">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2446">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2496">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
  <animation>
   <frame tileid="2496" duration="200"/>
   <frame tileid="2506" duration="200"/>
   <frame tileid="2501" duration="200"/>
   <frame tileid="2506" duration="200"/>
  </animation>
 </tile>
 <tile id="2497">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2498">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Melted Ice" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
  <animation>
   <frame tileid="2498" duration="200"/>
   <frame tileid="2508" duration="200"/>
   <frame tileid="2503" duration="200"/>
   <frame tileid="2508" duration="200"/>
  </animation>
 </tile>
 <tile id="2499">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2499" duration="200"/>
   <frame tileid="2509" duration="200"/>
   <frame tileid="2504" duration="200"/>
   <frame tileid="2509" duration="200"/>
  </animation>
 </tile>
 <tile id="2500">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2500" duration="200"/>
   <frame tileid="2510" duration="200"/>
   <frame tileid="2505" duration="200"/>
   <frame tileid="2510" duration="200"/>
  </animation>
 </tile>
 <tile id="2501">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="-0.125" width="12" height="32.25"/>
   <object id="2" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="2503">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Melted Ice" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="2504">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2505">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2506">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="-0.125" width="12" height="32.25"/>
   <object id="2" name="Water" type="water_deep" x="12.0909" y="-9.71445e-16" width="19.9091" height="32"/>
  </objectgroup>
 </tile>
 <tile id="2508">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="-9.71445e-16" width="19.9091" height="32"/>
   <object id="2" name="Melted Ice" type="water" x="20" y="-0.125" width="12" height="32.25"/>
  </objectgroup>
 </tile>
 <tile id="2509">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2510">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2560">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2560" duration="200"/>
   <frame tileid="2570" duration="200"/>
   <frame tileid="2565" duration="200"/>
   <frame tileid="2570" duration="200"/>
  </animation>
 </tile>
 <tile id="2561">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
  <animation>
   <frame tileid="2561" duration="200"/>
   <frame tileid="2571" duration="200"/>
   <frame tileid="2566" duration="200"/>
   <frame tileid="2571" duration="200"/>
  </animation>
 </tile>
 <tile id="2562">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2562" duration="200"/>
   <frame tileid="2572" duration="200"/>
   <frame tileid="2567" duration="200"/>
   <frame tileid="2572" duration="200"/>
  </animation>
 </tile>
 <tile id="2565">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2566">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2567">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2570">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="32.0909" y="19.9964">
    <polygon points="-0.0111989,0.134387 -6.20571,0.0837945 -14.2082,-4.08801 -18.3012,-10.0139 -20.2125,-19.9398 -32.0909,-19.9837 -32.0938,11.9922 -0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="32.0909" y="20.0923">
    <polygon points="0,0 -6.09091,0 -14.1818,-4.36364 -18.1818,-10.0909 -20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2571">
  <objectgroup>
   <object id="1" name="Water" type="water_deep" x="0" y="0" width="32" height="19.9091"/>
   <object id="2" name="water" type="water" x="0" y="20" width="32" height="12"/>
  </objectgroup>
 </tile>
 <tile id="2572">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.00284091" y="19.9964">
    <polygon points="0.0111989,0.134387 6.20571,0.0837945 14.2082,-4.08801 18.3012,-10.0139 20.2125,-19.9398 32.0909,-19.9837 32.0938,11.9922 0.0974747,11.9889"/>
   </object>
   <object id="2" name="Water" type="water_deep" x="-0.00284091" y="20.0923">
    <polygon points="0,0 6.09091,0 14.1818,-4.36364 18.1818,-10.0909 20.2727,-19.9091 0,-19.9091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2624">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.0625,1.625 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13.0625,23.25 -16.2813,23.2813 -15.8125,17.875 -15.875,14.4375 -13.3125,11.625 -11.125,7 -6.8125,5.625 -3.125,2.75 -2.75,1.4375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.25 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -13,23.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2625">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
   <object id="2" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
  </objectgroup>
 </tile>
 <tile id="2626">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,2.6875 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 17.5938,23.1563 16.625,17.5 16.75,11.375 12.875,10.5 11.125,7 7.125,5.25 4.75,2.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2627">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0,0 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25 -19.6875,23.1875 -19.0625,20.625 -15.8125,17.875 -15.4375,14.875 -12.4375,12.75 -11.125,7 -6.3125,6.75 -3.125,2.75 -1.4375,0.1875"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -16.1875,23.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2628">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0" y="9.9375" width="32" height="7.875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="17.875" width="32.0625" height="14.125"/>
  </objectgroup>
 </tile>
 <tile id="2629">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="0.21875" y="8.8125">
    <polygon points="0,1.375 -0.0625,7.375 5.125,9.9375 7.6875,16 12.1875,18.4375 13.6875,20.875 15.6875,23.125 21.3438,23.1563 18.0625,17.25 16.75,11.375 12.875,10.5 11.0625,8.625 10.8125,4 4.75,2.5625"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="0.21875" y="8.8125">
    <polygon points="0,23.25 -0.0625,7.375 4.9375,9.8125 7.6875,16 12.25,18.6875 13.9375,21.25 15.6875,23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2630">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,7.375 -6.1875,10.1875 -9.625,15.6875 -10,18.125 -12.9375,21.1875 -12.875,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2631">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="16.25" width="32.0625" height="15.75"/>
  </objectgroup>
 </tile>
 <tile id="2632">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="8.8125">
    <polygon points="0,23.1875 -0.1875,9.5625 2.8125,9.6875 6.5,13.25 8.625,14.5 11.75,18.625 12.875,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2633">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.9375" y="8.6875">
    <polygon points="0.125,6.8125 0,14.375 -5.6875,16.75 -7.75,19 -10.5,20.75 -13.0625,23.375 -15.1875,23.25 -14.75,16.375 -8,13.125 -6.8125,8.1875 -3.625,8.25"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.9375" y="8.6875">
    <polygon points="0,23.1875 0.0625,14.4375 -5.625,16.8125 -7.5625,19 -10.625,21.0625 -12.8125,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2634">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.1875" y="14.75" width="32" height="7.4375"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="22.0625" width="32.0625" height="9.9375"/>
  </objectgroup>
 </tile>
 <tile id="2635">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.125" y="8.75">
    <polygon points="-0.125,6.8125 0,14.375 5.6875,16.75 7.75,19 10.5,20.75 13.0625,23.375 15.1875,23.25 14.75,16.375 8,13.125 6.8125,8.1875 3.625,8.25"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="-0.125" y="8.75">
    <polygon points="0,23.1875 -0.0625,14.4375 5.625,16.8125 7.5625,19 10.625,21.0625 12.8125,23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2688">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2690">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2691">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2693">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
   <object id="2" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="2694">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="17.0625" y="-0.0625" width="14.875" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2695">
  <animation>
   <frame tileid="2183" duration="200"/>
   <frame tileid="2695" duration="200"/>
  </animation>
 </tile>
 <tile id="2696">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="16" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2697">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="13.25" y="-0.0625" width="5.6875" height="32.1875"/>
   <object id="2" name="Melted Ice" type="water" x="18.9375" y="-0.0625" width="13" height="32.125"/>
  </objectgroup>
 </tile>
 <tile id="2698">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="2186" duration="200"/>
   <frame tileid="2698" duration="200"/>
  </animation>
 </tile>
 <tile id="2699">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.0625" y="-0.0625" width="13" height="32.125"/>
   <object id="2" name="Collision" type="ledge" x="12.9375" y="-0.0625" width="5.6875" height="32.1875"/>
  </objectgroup>
 </tile>
 <tile id="2752">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="31.875" y="23.4063">
    <polygon points="0.0625,-7.0625 0.1875,-9.75 -5.1875,-10.3125 -9,-16.1875 -11.875,-17.9375 -13.875,-20.3125 -13.9375,-23.375 -16.2813,-23.2813 -15.8125,-17.875 -13.3125,-14.5 -10.5,-12.6875 -7.875,-9.9375 -4.8125,-7.3125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="31.875" y="23.4063">
    <polygon points="0,-23.3125 0.0625,-9.6875 -5.1875,-10.1563 -7.3125,-12.9375 -9.125,-16.25 -11.9375,-18 -13.8125,-20.4375 -13.875,-23.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2753">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
  </objectgroup>
 </tile>
 <tile id="2754">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="-0.09375" y="23.2188">
    <polygon points="0,-23.25 0.125,-7.9375 6.1875,-10.1875 10,-14.125 10.1875,-16.3125 13.0625,-17.5625 13,-23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="-0.09375" y="23.2188">
    <polygon points="0.125,-6.125 0.0625,-7.9375 6.1875,-10.1875 9.8125,-14 10,-16.1875 12.9375,-17.5 13.0625,-23.25 16.2813,-23.2813 16,-17.875 14.5625,-14.75 11.8125,-11.625 9.25,-9.9375 6.8125,-6.875 3.8125,-5.9375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2755">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="32" y="23.25">
    <polygon points="0,-4.5625 0.0625,-7.375 -6.125,-9.1875 -9.125,-15.25 -12.875,-17.375 -14.625,-19.75 -15.6875,-23.125 -19.4688,-23.1563 -17.5,-19 -15.375,-16.625 -13.3125,-14 -10.375,-11.5 -8.1875,-8.1875 -3.9375,-5.375"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="32" y="23.25">
    <polygon points="0,-23.25 0.0625,-7.375 -6,-9.1875 -9.125,-15.125 -12.8125,-17.3125 -14.5625,-19.625 -15.6875,-23.1875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2756">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="-0.0625" y="12.9375" width="32.125" height="5.9375"/>
   <object id="2" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="12.9375"/>
  </objectgroup>
 </tile>
 <tile id="2757">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.09375" y="23.1875">
    <polygon points="0,-23.25 -0.0625,-7.375 6,-9.1875 11.6875,-12.3125 12.75,-18.9375 14.5625,-20.3125 15.6875,-23.1875"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0.09375" y="23.1875">
    <polygon points="0,-5.1875 -0.0625,-7.375 6.125,-9.1875 11.6875,-12.4375 12.625,-18.875 14.6875,-20.375 15.6875,-23.125 21.3438,-23.1563 17.375,-17.625 15.125,-14.9375 13.75,-11.0625 9.9375,-9.125 8.4375,-5.375 3.5,-4.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2758">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="31.75" y="23.375">
    <polygon points="0.1875,-23.25 0.125,-11.5625 -3,-11.75 -6.5,-13.25 -8.625,-14.5 -11.75,-18.625 -12.875,-23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2759">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="15.5"/>
  </objectgroup>
 </tile>
 <tile id="2760">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0.125" y="23.25">
    <polygon points="0,-23.1875 -0.1875,-9.5625 2.8125,-9.6875 6.5,-13.25 8.625,-14.5 11.75,-18.625 12.875,-23.3125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2761">
  <objectgroup>
   <object id="1" name="Collision" type="ledge" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,14.9375 5.625,14.9375 5.5,12.25 3.0625,8.9375 -0.75,7.75 -1.5625,6.75 -2.75,2.6875 -2.625,-0.125"/>
   </object>
   <object id="2" name="Melted Ice" type="water" x="19.5625" y="0">
    <polygon points="0,0 0.8125,1.75 3.25,1.8125 5.5,4.1875 5.375,6.4375 10.1875,6.9375 12.3125,9.75 12.5625,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="2762">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="0" width="32.0625" height="11.375"/>
   <object id="2" name="Collision" type="ledge" x="-0.0625" y="11.375" width="32.125" height="7.5"/>
  </objectgroup>
 </tile>
 <tile id="2763">
  <objectgroup>
   <object id="1" name="Melted Ice" type="water" x="0" y="23.1875">
    <polygon points="0,-23.1875 0.0625,-12.3125 5.3125,-13.375 7.9375,-15.75 8.25,-18.1875 12.3125,-23.25"/>
   </object>
   <object id="2" name="Collision" type="ledge" x="0" y="23.1875">
    <polygon points="-0.125,-6.8125 0.0625,-12.25 5.25,-13.3125 7.9375,-15.6875 8.1875,-18.125 12.4375,-23.375 15.1875,-23.25 14.75,-16.375 8,-13.125 6.8125,-8.1875 3.625,-8.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3264" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="14" y="-0.272727">
    <polygon points="0,0 -11.9091,25.3636 -12.0909,26.9091 -8,31.4545 -0.545455,32.2727 9.54545,32.3636 14.1818,28.0909 14.1818,23.0909 10,1.81818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3265" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="9" y="3.625">
    <polygon points="0,0 21.875,11 22,16.25 14.625,24.75 -8.125,13.375 -8.125,10.25 -5.25,7.75 -5.25,3.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3266" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="22.875" y="3.625">
    <polygon points="0,0 -21.875,11 -22,16.25 -14.625,24.75 8.125,13.375 8.125,10.25 5.25,7.75 5.25,3.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3267" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="15.625" y="14.25">
    <polygon points="0,0 13.375,7 13.5,10.5 10.75,13.625 8.625,13.5 3.5,11.125 -4.625,14.875 -8.375,16.875 -12.5,13.75 -12.5,10.625 -5.5,7.125 -5.75,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3268" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="16.625" y="11.25">
    <polygon points="0,0 -13.375,7 -13.5,10.5 -11.125,13.25 -11.5,14.625 -11.875,17 -8.125,20.875 -6.75,20.875 4.625,14.875 8.375,16.875 12.5,13.75 12.5,10.625 5.5,7.125 5.75,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3269" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="8.625" y="4.25">
    <polygon points="0,0 13.25,12.875 13.25,15.625 8.375,18.375 -4.75,5.5 -4.75,2.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3270" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="16.625" y="6.25">
    <polygon points="0,0 -13.375,7 -13.5,10.5 -10.75,13.625 -8.625,13.5 -3.5,11.125 4.625,14.875 8.375,16.875 12.5,13.75 12.5,10.625 5.5,7.125 5.75,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3271" type="lumber">
  <objectgroup draworder="index" id="3">
   <object id="1" name="Pile" type="lumber" x="16.625" y="6.25">
    <polygon points="0,0 -13.375,7 -13.5,10.5 -11.125,13.25 -11.5,14.625 -11.875,17 -8.125,20.875 -6.75,20.875 4.625,14.875 8.375,16.875 12.5,13.75 12.5,10.625 5.5,7.125 5.75,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3272" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="24.875" y="4.625">
    <polygon points="0,0 -1.625,0.25 -23,11.375 -23,13.875 -18.375,18.5 4.125,7.125 4.25,4.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3273" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="31.875" y="4.375">
    <polygon points="0,0 -25.875,9.375 -26.875,10.5 -26.875,13.375 -15.25,24.875 0.125,19.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3274" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="25.875" y="1.125" width="26" height="22">
    <polygon points="-1.875,5.375 -7.375,0.0625 -16.5,0.34375 -26,3.875 -26,22 -13.75,18.75 0.75,14.125 -0.1875,11.3438 -2.25,8.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3275" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="6" y="1" width="26" height="22">
    <polygon points="1.875,5.375 7.375,0.0625 16.5,0.34375 26,3.875 26,22 13.75,18.75 -0.75,14.125 0.1875,11.3438 2.25,8.6875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3276" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="0.125" y="4.375">
    <polygon points="0,0 25.875,9.375 26.875,10.5 26.875,13.375 15.25,24.875 -0.125,19.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3277" type="above"/>
 <tile id="3278" type="above"/>
 <tile id="3279" type="above"/>
 <tile id="3280" type="above"/>
 <tile id="3281">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3282">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="13.0909" y="9.81818">
    <polygon points="0,0 7.72727,0 12.6364,4.54545 16,11 16,13.9091 6.09091,21.1818 -5.45455,21.1818 -10.1818,16.9091 -10.3636,12 -7,3.63636"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3283">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3284">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3285">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="coal" x="13.0909" y="9.81818">
    <polygon points="0,0 7.72727,0 12.6364,4.54545 16,11 16,13.9091 6.09091,21.1818 -5.45455,21.1818 -10.1818,16.9091 -10.3636,12 -7,3.63636"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3286">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="coal" x="12.2727" y="5.63636">
    <polygon points="0,0 8.54545,0 10.4545,2.18182 12.5455,2.18182 14.6364,3.90909 14.7273,9.72727 13.3636,14.5455 7.54545,19.4545 1.72727,19.5455 -3.54545,18.2727 -6.45455,15.0909 -7.45455,11.6364 -7.36364,6.36364"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3289">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3290">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="11.0909" y="3.63636">
    <polygon points="0,0 10.6364,2.09091 13.5455,5.36364 15.8182,7.63636 18.8182,13.7273 18.7273,15.7273 14.0909,25.2727 4.18182,27.6364 0.636364,26.8182 -4.54545,24.1818 -6.18182,22.3636 -8.09091,19.0909 -8.27273,12.1818 -4.90909,6.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3291">
  <objectgroup>
   <object id="1" name="Rock" type="empty" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3292">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3293">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="13.0909" y="9.81818">
    <polygon points="0,0 7.72727,0 12.6364,4.54545 16,11 16,13.9091 6.09091,21.1818 -5.45455,21.1818 -10.1818,16.9091 -10.3636,12 -7,3.63636"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3294">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3295">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="empty" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3296">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3297">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3298">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3299">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3300">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3301">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3318" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="4.125" y="12.625">
    <polygon points="0,0 5.625,0.125 25.75,3.5 25.875,11 24,19.5 -4.25,19.375 -4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3319" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="25.75" y="12.625">
    <polygon points="0,0 -5.625,0.125 -25.75,3.5 -25.875,11 -24,19.5 4.25,19.375 4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3320">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3321">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3322">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3323" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="0" y="16" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3324" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="6" y="16" width="26" height="16">
    <polygon points="2.5,-0.625 26,2.25 26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3325" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="0" y="19" width="30" height="13">
    <polygon points="0,0 30,2.875 29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3326" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="32" y="19" width="30" height="13">
    <polygon points="0,0 -30,2.875 -29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3327" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="26" y="16" width="26" height="16">
    <polygon points="-2.5,-0.625 -26,2.25 -26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3328" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="13.25" y="-0.125">
    <polygon points="0,0 2.5,0 18.875,5.875 18.875,16.375 -5.375,8.125 -5.375,5.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3329" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="0.25" y="5.625">
    <polygon points="0,0 22.375,7.75 22.5,11.125 17.625,16.5 -0.25,10.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3330" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="31.5" y="5.625">
    <polygon points="0,0 -22.375,7.75 -22.5,11.125 -17.625,16.5 0.25,10.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3331" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="18.75" y="-0.125">
    <polygon points="0,0 -2.5,0 -18.875,5.875 -18.875,16.375 5.375,8.125 5.375,5.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3332" type="lumber"/>
 <tile id="3333" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="16.125" y="1.875">
    <polygon points="0,0 2.875,0 7,4 7,6 -4.25,27 -6.625,27.25 -11.125,23.125 -11.125,21"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3334" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="9.125" y="0.625">
    <polygon points="0,0 3.25,0.875 8.125,27.375 3,31.75 -0.125,28.75 -4.5,4.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3335" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="13.875" y="0.125">
    <polygon points="0,0 8.25,1.5 5.125,31.75 -0.875,32 -3.75,31 -3.875,21.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3336" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="14.25" y="-0.25">
    <polygon points="0,0 7.375,1.875 10.5,1.375 12.75,2 17.125,28.375 12.5,32.5 -1.125,32.375 -4.25,31.125 -4.5,22.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3337" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="22.875" y="9.5">
    <polygon points="0,0 2.125,-0.125 6,3.875 6,7.5 1.25,10 1.125,11.125 4.25,11.75 6.875,13.5 8,14.5 8,17.25 4,21.625 2.125,21.625 -9.25,15.625 -15.875,18.625 -21.125,14 -20.875,11.375 -19.25,10.25 -19.25,7.5 -14.625,3.375 -13,3.25 -9.625,5.25 -8.5,5.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3338" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="1" y="5" width="29" height="23">
    <polygon points="0,10.875 2.15625,9.75391 2.3125,6.63281 6.625,2.39063 11,5.15625 22,-0.5625 27,3.5 26.9688,11.6719 29.1875,16.8438 24.625,21.4375 19.25,19.125 14.25,23.5 8.78125,21.25 8.5625,18.5 4.625,18.5 0,14.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3339" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="21.625" y="10.25">
    <polygon points="0,0 -21.25,11.375 -21.5,14.875 -17,19.375 -2,11.875 5.375,19 10.425,15.7333 10.3736,12.7778 8.83333,12.4889 5.5,9.125 5.5,7.125 5.75,4.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3340" type="lumber">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Pile" type="lumber" x="17.875" y="5.625">
    <polygon points="0,0 -17.625,8.875 -17.625,14 -5.5,26.5 13.125,17.375 13.125,12.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3341">
  <objectgroup draworder="index" id="2">
   <object id="4" name="Container" type="rack" x="1.18182" y="21.8182">
    <polygon points="0,0 3.81818,2.18182 7.54545,2.18182 30.8182,4.27273 31,-21.8182 0.727273,-21.8182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3342">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Container" type="rack" x="31.0909" y="29.9091">
    <polygon points="0,0 0.0909091,-7.90909 -3.18182,-30 -31.0909,-30 -31,-4.18182 -18.1818,1.90909 -14.1818,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3343">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="rack" x="1.09091" y="29.9091">
    <polygon points="0,0 -0.0909091,-7.90909 3.18182,-30 31.0909,-30 31,-4.18182 18.1818,1.90909 14.1818,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3344">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="rack" x="31.0909" y="21.8182">
    <polygon points="0,0 -3.81818,2.18182 -7.54545,2.18182 -30.8182,4.27273 -31,-21.8182 -0.727273,-21.8182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3345">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3346">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3347">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3348">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3349">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3350">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3351">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3352">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3353">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3354">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3355">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3356">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3357">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3358">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3359">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3360">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3361">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="14.1818" y="0.727273">
    <polygon points="0,0 3.27273,0.181818 5,3.36364 5.45455,6.81818 8.09091,9.09091 10.0909,14.3636 11.8182,15 15.9091,19.2727 16,27 12.7273,29.4545 6,29.4545 1.81818,27.1818 -4.90909,27.1818 -11.0909,25.4545 -13.4545,23 -13.1818,15.8182 -11.1818,12.0909 -8,10.2727 -5.81818,7.09091 -4,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3362">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3363">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="13.0909" y="9.81818">
    <polygon points="0,0 7.72727,0 12.6364,4.54545 16,11 16,13.9091 6.09091,21.1818 -5.45455,21.1818 -10.1818,16.9091 -10.3636,12 -7,3.63636"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3380" type="above"/>
 <tile id="3381" type="above"/>
 <tile id="3382">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="0" y="0" width="28" height="16">
    <polygon points="0,0 27.8182,-0.181818 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3383">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="29.9318" y="0" width="28" height="16">
    <polygon points="0,0 -27.8182,-0.181818 -27.9318,6.51136 -25.5,15.75 -14,14.875 -1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3384">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="-0.181818" y="16.1818" width="28" height="16">
    <polygon points="0,0 4.18182,-16.4545 10.3636,-16.5 30.4091,-12.8864 29,-2 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3385">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3386">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3387">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3388">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="6" y="0" width="26" height="19">
    <polygon points="0,0 26,0 26,19 1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3389">
  <objectgroup draworder="index" id="2">
   <object id="1" name=" Container" type="trough" x="0" y="0" width="29.125" height="22">
    <polygon points="0,0 29.125,0 26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3390">
  <objectgroup draworder="index" id="2">
   <object id="1" name=" Container" type="trough" x="32.125" y="0" width="29.125" height="22">
    <polygon points="0,0 -29.125,0 -26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3391">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="26" y="0" width="26" height="19">
    <polygon points="0,0 -26,0 -26,19 -1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3392" type="above"/>
 <tile id="3393" type="above"/>
 <tile id="3394">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="14.9091" y="10.1818">
    <polygon points="0,0 8.81818,9 15.3636,22.0909 -10.1818,22 -10.0909,18.0909 -5.90909,1.90909 -3.72727,0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3395">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="12.1818" y="-0.181818">
    <polygon points="0,0 8.81818,9 16.9091,25.2727 16.9091,26.8182 4,32.0909 2.09091,32.1818 -10,21 -10.0909,18.0909 -5.90909,1.90909 -3.72727,0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3396">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Ladder" type="climb" x="3.09091" y="7.18182" width="25.8182" height="24.8182"/>
  </objectgroup>
 </tile>
 <tile id="3399" type="above"/>
 <tile id="3400" type="above"/>
 <tile id="3401">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3402">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3403">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3404">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3405" type="above"/>
 <tile id="3406" type="above"/>
 <tile id="3407" type="above"/>
 <tile id="3408" type="above"/>
 <tile id="3409">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3410">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3411">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="11.0909" y="3.63636">
    <polygon points="0,0 10.6364,2.09091 13.5455,5.36364 15.8182,7.63636 18.8182,13.7273 18.7273,15.7273 14.0909,25.2727 4.18182,27.6364 0.636364,26.8182 -4.54545,24.1818 -6.18182,22.3636 -8.09091,19.0909 -8.27273,12.1818 -4.90909,6.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3412">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3413">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3414">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3415">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="11.0909" y="3.63636">
    <polygon points="0,0 10.6364,2.09091 13.5455,5.36364 15.8182,7.63636 18.8182,13.7273 18.7273,15.7273 14.0909,25.2727 4.18182,27.6364 0.636364,26.8182 -4.54545,24.1818 -6.18182,22.3636 -8.09091,19.0909 -8.27273,12.1818 -4.90909,6.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3416">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3417">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3418">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3419">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="11.0909" y="3.63636">
    <polygon points="0,0 10.6364,2.09091 13.5455,5.36364 15.8182,7.63636 18.8182,13.7273 18.7273,15.7273 14.0909,25.2727 4.18182,27.6364 0.636364,26.8182 -4.54545,24.1818 -6.18182,22.3636 -8.09091,19.0909 -8.27273,12.1818 -4.90909,6.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3420">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3421">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3422">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="7.27273" y="9.90909">
    <polygon points="0,0 9.63636,-6.90909 12.6364,-6.90909 17.7273,-2.90909 18.5455,-1 19.3636,3 21.5455,4.09091 22.5455,6.09091 22.5455,12.9091 21.6364,17 17.5455,19.1818 10.3636,20.1818 0.909091,21.1818 -5.45455,17 -5.27273,12.9091 -0.363636,7.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3423">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="11.0909" y="3.63636">
    <polygon points="0,0 10.6364,2.09091 13.5455,5.36364 15.8182,7.63636 18.8182,13.7273 18.7273,15.7273 14.0909,25.2727 4.18182,27.6364 0.636364,26.8182 -4.54545,24.1818 -6.18182,22.3636 -8.09091,19.0909 -8.27273,12.1818 -4.90909,6.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3424">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3425">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3426">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="13.9091" y="2.63636">
    <polygon points="0,0 5.09091,0.0909091 7.63636,3.09091 11.8182,3.09091 14.0909,5 16.3636,17.4545 16.1818,22.4545 6.63636,28.5455 2.18182,28.4545 -3.09091,24.5455 -9,23.3636 -11.0909,20.8182 -11.1818,11.9091 -7.81818,8.27273 -4.90909,6.27273 -4,4.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3427">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="13.0909" y="9.81818">
    <polygon points="0,0 7.72727,0 12.6364,4.54545 16,11 16,13.9091 6.09091,21.1818 -5.45455,21.1818 -10.1818,16.9091 -10.3636,12 -7,3.63636"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3441" type="above"/>
 <tile id="3442" type="above"/>
 <tile id="3443" type="above"/>
 <tile id="3444" type="above"/>
 <tile id="3445" type="above"/>
 <tile id="3446" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="4.125" y="12.625">
    <polygon points="0,0 5.625,0.125 25.75,3.5 25.875,11 24,19.5 -4.25,19.375 -4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3447" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="25.75" y="12.625">
    <polygon points="0,0 -5.625,0.125 -25.75,3.5 -25.875,11 -24,19.5 4.25,19.375 4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3448">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3449">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3450">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3451" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="16" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3452" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="16" width="26" height="16">
    <polygon points="2.5,-0.625 26,2.25 26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3453" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="19" width="30" height="13">
    <polygon points="0,0 30,2.875 29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3454" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="32" y="19" width="30" height="13">
    <polygon points="0,0 -30,2.875 -29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3455" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="16" width="26" height="16">
    <polygon points="-2.5,-0.625 -26,2.25 -26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3456">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="tool" x="5" y="0" width="27" height="28">
    <polygon points="0,0 27,0 27,28 0,28"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3457">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Collision" type="tool" x="0" y="0" width="25" height="28"/>
  </objectgroup>
 </tile>
 <tile id="3458">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="32.1818" y="4.90909">
    <polygon points="0,0 -13.4545,5.18182 -15.0909,5.18182 -26.2727,-4.90909 -2.09091,-4.90909 0,-1.81818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3459">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="17.0909" y="10.1818">
    <polygon points="0,0 -8.81818,9 -15.3636,22.0909 10.1818,22 10.0909,18.0909 5.90909,1.90909 3.72727,0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3460">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Ladder" type="climb" x="3.18182" y="0" width="25.9091" height="32.0909"/>
  </objectgroup>
 </tile>
 <tile id="3463">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="tool" x="7" y="0" width="25" height="28"/>
  </objectgroup>
 </tile>
 <tile id="3464">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="tool" x="0" y="0" width="27" height="28"/>
  </objectgroup>
 </tile>
 <tile id="3465">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3466">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3467">
  <objectgroup>
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3468">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="table" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3469">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="rack" x="3.1041" y="-0.00416667" width="28.9013" height="29.8265">
    <polygon points="0,0 28.9013,0 28.9013,29.8265 0,29.8265"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3470">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="rack" x="0.0131944" y="-0.00416667" width="29.0831" height="30.0992">
    <polygon points="0,0 29.0831,0 29.0831,30.0992 0,30.0992"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3471">
  <objectgroup>
   <object id="1" name="Container" type="rack" x="3.1041" y="-0.00416667" width="28.9013" height="29.8265">
    <polygon points="0,0 28.9013,0 28.9013,29.8265 0,29.8265"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3472">
  <objectgroup>
   <object id="1" name="Collision" type="rack" x="0.0131944" y="-0.00416667" width="29.0831" height="30.0992">
    <polygon points="0,0 29.0831,0 29.0831,30.0992 0,30.0992"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3473">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mineral" type="ore" x="14.375" y="12.875">
    <polygon points="0,0 5.5,-11.75 9.875,-12 7.875,-1.125 13.5,-2.125 13.75,1.625 5.375,10.125 2.25,10.125 -0.25,8.25 -5,8.25 -7.625,2.125 -7.625,-3 -6.25,-4.125 -2.375,-4.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3474">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="10.2727" y="5.63636">
    <polygon points="0,-2.75 7.42045,-1.75 10.2045,1.68182 12.4205,1.68182 14.6364,3.90909 14.7273,9.72727 12.9886,14.4205 10.517,17.875 6.17045,19.4545 1.72727,19.5455 -2.79545,18.3977 -5.57955,15.0909 -7.82955,11.6364 -7.98864,5.23864 -4.11648,1.80398 -2.99432,-0.38068"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3476">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3477">
  <objectgroup>
   <object id="1" name="Mineral" type="ore" x="14.375" y="12.875">
    <polygon points="0,0 5.5,-11.75 9.875,-12 7.875,-1.125 13.5,-2.125 13.75,1.625 5.375,10.125 2.25,10.125 -0.25,8.25 -5,8.25 -7.625,2.125 -7.625,-3 -6.25,-4.125 -2.375,-4.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3478">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="10.2727" y="5.63636">
    <polygon points="0,-2.75 7.42045,-1.75 10.2045,1.68182 12.4205,1.68182 14.6364,3.90909 14.7273,9.72727 12.9886,14.4205 10.517,17.875 6.17045,19.4545 1.72727,19.5455 -2.79545,18.3977 -5.57955,15.0909 -7.82955,11.6364 -7.98864,5.23864 -4.11648,1.80398 -2.99432,-0.38068"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3480">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3481">
  <objectgroup>
   <object id="1" name="Mineral" type="ore" x="14.375" y="12.875">
    <polygon points="0,0 5.5,-11.75 9.875,-12 7.875,-1.125 13.5,-2.125 13.75,1.625 5.375,10.125 2.25,10.125 -0.25,8.25 -5,8.25 -7.625,2.125 -7.625,-3 -6.25,-4.125 -2.375,-4.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3482">
  <objectgroup>
   <object id="1" name="Rock" type="ore" x="10.2727" y="5.63636">
    <polygon points="0,-2.75 7.42045,-1.75 10.2045,1.68182 12.4205,1.68182 14.6364,3.90909 14.7273,9.72727 12.9886,14.4205 10.517,17.875 6.17045,19.4545 1.72727,19.5455 -2.79545,18.3977 -5.57955,15.0909 -7.82955,11.6364 -7.98864,5.23864 -4.11648,1.80398 -2.99432,-0.38068"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3484">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3485">
  <objectgroup>
   <object id="1" name="Mineral" type="ore" x="14.375" y="12.875">
    <polygon points="0,0 5.5,-11.75 9.875,-12 7.875,-1.125 13.5,-2.125 13.75,1.625 5.375,10.125 2.25,10.125 -0.25,8.25 -5,8.25 -7.625,2.125 -7.625,-3 -6.25,-4.125 -2.375,-4.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3486">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="10.2727" y="5.63636">
    <polygon points="0,-2.75 7.42045,-1.75 10.2045,1.68182 12.4205,1.68182 14.6364,3.90909 14.7273,9.72727 12.9886,14.4205 10.517,17.875 6.17045,19.4545 1.72727,19.5455 -2.79545,18.3977 -5.57955,15.0909 -7.82955,11.6364 -7.98864,5.23864 -4.11648,1.80398 -2.99432,-0.38068"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3488">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3489">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Rock" type="ore" x="12.2727" y="5.63636">
    <polygon points="0,0 8.54545,0 10.4545,2.18182 12.5455,2.18182 14.6364,3.90909 14.7273,9.72727 13.3636,14.5455 7.54545,19.4545 1.72727,19.5455 -3.54545,18.2727 -6.45455,15.0909 -7.45455,11.6364 -7.36364,6.36364"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3491">
  <objectgroup>
   <object id="1" name="Mineral" type="bar" x="18.875" y="6.875">
    <polygon points="0,0 -13,6.125 -14.875,9.625 -15,12 -9.875,17.375 6.125,9.75 6.125,5.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3505" type="above"/>
 <tile id="3506" type="above"/>
 <tile id="3507" type="above"/>
 <tile id="3508">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Planter" type="vase" x="7" y="3.875" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3509">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Planter" type="vase" x="3.25" y="0" width="25.75" height="17.25">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3510">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="28" height="16">
    <polygon points="0,0 27.8182,-0.181818 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3511">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="29.9318" y="0" width="28" height="16">
    <polygon points="0,0 -27.8182,-0.181818 -27.9318,6.51136 -25.5,15.75 -14,14.875 -1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3512">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="-0.181818" y="16.1818" width="28" height="16">
    <polygon points="0,0 4.18182,-16.4545 10.3636,-16.5 30.4091,-12.8864 29,-2 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3513">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3514">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3515">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3516">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="0" width="26" height="19">
    <polygon points="0,0 26,0 26,19 1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3517">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="0" y="0" width="29.125" height="22">
    <polygon points="0,0 29.125,0 26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3518">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="32.125" y="0" width="29.125" height="22">
    <polygon points="0,0 -29.125,0 -26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3519">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="0" width="26" height="19">
    <polygon points="0,0 -26,0 -26,19 -1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3520" type="above"/>
 <tile id="3522">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="20" y="-0.181818">
    <polygon points="0,0 -8.81818,9 -16.9091,25.2727 -16.9091,26.8182 -4,32.0909 -2.09091,32.1818 10,21 10.0909,18.0909 5.90909,1.90909 3.72727,0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3523">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Obstacle" type="sawhorse" x="-0.0909091" y="4.90909">
    <polygon points="0,0 13.4545,5.18182 15.0909,5.18182 26.2727,-4.90909 2.09091,-4.90909 0,-1.81818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3524">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Ladder" type="climb" x="3" y="0.0909091" width="25.9091" height="25.8182"/>
  </objectgroup>
 </tile>
 <tile id="3525">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ladder" x="8" y="0" width="20" height="26"/>
  </objectgroup>
 </tile>
 <tile id="3526">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="ladder" x="4" y="0" width="20" height="26"/>
  </objectgroup>
 </tile>
 <tile id="3528" type="above"/>
 <tile id="3529" type="above"/>
 <tile id="3530" type="above"/>
 <tile id="3531" type="above"/>
 <tile id="3532" type="above"/>
 <tile id="3533" type="above"/>
 <tile id="3534" type="above"/>
 <tile id="3536">
  <animation>
   <frame tileid="3535" duration="200"/>
   <frame tileid="3536" duration="200"/>
   <frame tileid="3537" duration="200"/>
   <frame tileid="3538" duration="200"/>
   <frame tileid="3535" duration="200"/>
  </animation>
 </tile>
 <tile id="3540">
  <animation>
   <frame tileid="3539" duration="200"/>
   <frame tileid="3540" duration="200"/>
   <frame tileid="3541" duration="200"/>
   <frame tileid="3542" duration="200"/>
   <frame tileid="3539" duration="200"/>
  </animation>
 </tile>
 <tile id="3543">
  <animation>
   <frame tileid="3543" duration="200"/>
   <frame tileid="3545" duration="200"/>
   <frame tileid="3547" duration="200"/>
   <frame tileid="3545" duration="200"/>
  </animation>
 </tile>
 <tile id="3544">
  <animation>
   <frame tileid="3544" duration="200"/>
   <frame tileid="3546" duration="200"/>
   <frame tileid="3548" duration="200"/>
   <frame tileid="3546" duration="200"/>
  </animation>
 </tile>
 <tile id="3549" type="above"/>
 <tile id="3550" type="above"/>
 <tile id="3551" type="above"/>
 <tile id="3552" type="above"/>
 <tile id="3553" type="above"/>
 <tile id="3554" type="above"/>
 <tile id="3555" type="above"/>
 <tile id="3556" type="above"/>
 <tile id="3569">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3570">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3571" type="above">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3572" type="above"/>
 <tile id="3573" type="above"/>
 <tile id="3574" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="4.125" y="12.625">
    <polygon points="0,0 5.625,0.125 25.75,3.5 25.875,11 24,19.5 -4.25,19.375 -4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3575" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="25.75" y="12.625">
    <polygon points="0,0 -5.625,0.125 -25.75,3.5 -25.875,11 -24,19.5 4.25,19.375 4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3576">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3577">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3578">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3579" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="16" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3580" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="16" width="26" height="16">
    <polygon points="2.5,-0.625 26,2.25 26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3581" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="19" width="30" height="13">
    <polygon points="0,0 30,2.875 29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3582" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="32" y="19" width="30" height="13">
    <polygon points="0,0 -30,2.875 -29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3583" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="16" width="26" height="16">
    <polygon points="-2.5,-0.625 -26,2.25 -26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3584" type="above"/>
 <tile id="3585" type="above"/>
 <tile id="3586" type="above"/>
 <tile id="3587" type="above">
  <animation>
   <frame tileid="3520" duration="200"/>
   <frame tileid="3587" duration="200"/>
   <frame tileid="3588" duration="200"/>
   <frame tileid="3591" duration="200"/>
   <frame tileid="3520" duration="200"/>
  </animation>
 </tile>
 <tile id="3588" type="above"/>
 <tile id="3589" type="above"/>
 <tile id="3590" type="above"/>
 <tile id="3591" type="above"/>
 <tile id="3592">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="13.875" y="0">
    <polygon points="0,0 -1,3.125 -1.75,6.875 -1,11.625 2.625,13.25 12.125,16.25 13.75,12.25 18,14 18.25,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3593">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="0" y="0" width="32" height="20.125">
    <polygon points="0,0 32,0 32.125,18.25 15.0625,17.4375 -0.125,14.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3594">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="32" y="0" width="32" height="20.125">
    <polygon points="0.125,0 -32,0 -32.125,18.25 -24.8438,17.6563 -11.8125,14.0625 -11.4688,17.2813 -6.92188,20.2031 0.125,18.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3595">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="5" y="0.375">
    <polygon points="0,-0.375 1.375,1.875 10,2.625 10.75,7.125 10.125,15.625 0.25,16.625 -1.875,13.75 -4.875,13.75 -4.875,-0.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3596">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="3.30682" y="-0.0909091">
    <polygon points="4.25,0 3.06818,4.0341 1.875,5.8409 2.69318,10.0909 2.7841,13.5909 10.4318,15.4091 15.8409,16.9034 28.875,18.1477 29,-0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3597">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="0" y="0" width="32" height="20.125">
    <polygon points="0,0 32,0 32.125,18.25 16.0625,20.0625 0,18.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3598">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="29" y="-0.0909091">
    <polygon points="-6.5,0 -1.44318,3.6591 -0.125,10.7159 2.30682,16.2159 0.9659,18.3409 -11.1818,19.2841 -24.5909,21.1534 -29,16.2727 -29,-0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3599" type="above"/>
 <tile id="3600" type="above"/>
 <tile id="3601">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Tool" type="anvil" x="29.8182" y="9">
    <polygon points="0,0 -19.8182,-0.181818 -29.7273,1.90909 -29.9091,4.81818 -25.6364,8.90909 -22.2727,10.1818 -22.0909,19.8182 -1.54545,19.9091 -1.63636,13.7273 0.272727,8"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3602">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="anvil" x="2.09091" y="5.10572">
    <polygon points="4.81818,-0.181818 20.6364,-0.287536 24.4545,2.38852 29.7273,2.88276 29.9091,5.21061 27.0909,9.72563 23.9091,11.2838 24.0909,22.8869 4.18182,22.9852 4.22727,14.1425 -2.18182,7.66351 -2.27273,4.10613"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3603">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Tool" type="anvil" x="32" y="29.0909">
    <polygon points="0,0 -11,0 -12.0909,-1.27273 -13,-10.2727 -19.1818,-16.0909 -21.0909,-19.4545 -19.8182,-21.1818 -17.7273,-23.1818 -15.8182,-24.0909 -14.0909,-25 -10.9091,-26.2727 0.0909091,-26.1818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3604">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Tool" type="anvil" x="0.0909091" y="2.81818">
    <polygon points="0,0 10.7273,-0.0909091 13.2727,2.54545 16.8182,3 19.6364,4.09091 24.8182,5.09091 24.9091,8 24,10.1818 14.9091,14.2727 12,14.2727 11.8182,24.8182 10.8182,26.1818 -0.0909091,26.0909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3605">
  <animation>
   <frame tileid="3605" duration="200"/>
   <frame tileid="3607" duration="200"/>
   <frame tileid="3609" duration="200"/>
   <frame tileid="3607" duration="200"/>
  </animation>
 </tile>
 <tile id="3606">
  <animation>
   <frame tileid="3606" duration="200"/>
   <frame tileid="3608" duration="200"/>
   <frame tileid="3610" duration="200"/>
   <frame tileid="3608" duration="200"/>
  </animation>
 </tile>
 <tile id="3613">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="-0.0909091" y="0">
    <polygon points="0,0 0.0909091,9.72727 4.18182,14 6.72727,15.1818 11.3636,16.1818 21.2727,16.0909 25.1818,14.7273 29.8182,11.7273 30.9091,9.27273 32.2727,3.63636 32.2727,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3614">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="1.18182" y="0.0909091">
    <polygon points="0,0 -0.00332906,5.02911 4.02868,8.41572 6.48092,9.12613 10.9475,9.72725 19.7664,9.67261 23.8051,8.85292 26.999,7.04955 29.5954,5.0286 31.0909,2.1859 31.0909,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3615">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="0.0909091" y="-0.0909091" width="31.9091" height="9"/>
  </objectgroup>
 </tile>
 <tile id="3616">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="7.90909" y="-0.0909091" width="24.0909" height="10.9091"/>
  </objectgroup>
 </tile>
 <tile id="3617">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="0.0454591" y="0.0909045" width="22.8182" height="10.9091"/>
  </objectgroup>
 </tile>
 <tile id="3618">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="0.136368" y="0.0909045" width="32" height="16.0909"/>
  </objectgroup>
 </tile>
 <tile id="3619">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="7.81818" y="0.136368" width="24.1818" height="16.0909"/>
  </objectgroup>
 </tile>
 <tile id="3620">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="0.181818" y="0.227277" width="22.8182" height="16.0909">
    <polygon points="0,0 22.8182,0 22.8182,16.0909 0,16.0909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3633" type="above"/>
 <tile id="3634" type="above"/>
 <tile id="3635" type="above">
  <objectgroup>
   <object id="1" name="Planter" type="wood" x="0.125" y="14.875" width="31.875" height="17.25"/>
  </objectgroup>
 </tile>
 <tile id="3636" type="above">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Planter" type="wood" x="0.125" y="14.875" width="31.875" height="17.25"/>
  </objectgroup>
 </tile>
 <tile id="3637" type="above"/>
 <tile id="3638">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="28" height="16">
    <polygon points="0,0 27.8182,-0.181818 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3639">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="29.9318" y="0" width="28" height="16">
    <polygon points="0,0 -27.8182,-0.181818 -27.9318,6.51136 -25.5,15.75 -14,14.875 -1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3640">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="-0.181818" y="16.1818" width="28" height="16">
    <polygon points="0,0 4.18182,-16.4545 10.3636,-16.5 30.4091,-12.8864 29,-2 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3641">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3642">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3643">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3644">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="0" width="26" height="19">
    <polygon points="0,0 26,0 26,19 1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3645">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="0" y="0" width="29.125" height="22">
    <polygon points="0,0 29.125,0 26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3646">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="32.125" y="0" width="29.125" height="22">
    <polygon points="0,0 -29.125,0 -26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3647">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="0" width="26" height="19">
    <polygon points="0,0 -26,0 -26,19 -1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3648" type="above"/>
 <tile id="3649" type="above"/>
 <tile id="3650" type="above"/>
 <tile id="3651" type="above"/>
 <tile id="3652" type="above"/>
 <tile id="3653" type="above"/>
 <tile id="3654" type="above"/>
 <tile id="3655" type="above"/>
 <tile id="3656" type="above"/>
 <tile id="3657" type="above"/>
 <tile id="3658" type="above"/>
 <tile id="3659" type="above"/>
 <tile id="3660" type="above"/>
 <tile id="3661" type="above"/>
 <tile id="3662" type="above"/>
 <tile id="3663">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="32.1875" y="0" width="28" height="20">
    <polygon points="0,0 -15.5,0 -16.25,3.375 -16.1875,7.5 -13.3438,8.875 -13.4219,13.25 -9.66016,14.5 -8.7793,16.3125 -1.875,16.875 0,14.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3664">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="0.1875" y="0.125" width="28" height="20">
    <polygon points="0,0 13.25,0.125 15.375,3.625 16.3125,10.125 13.2188,11.125 13.4219,15 9.66016,16.25 6.7793,18.3125 -0.125,18.75"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3665">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="anvil" x="0.181818" y="9">
    <polygon points="0,0 20.4545,-0.0909091 24.4545,1.22727 31.8182,2.09091 32,4.90909 26.9091,8.81818 22.2727,10.1818 22.0909,19.8182 1.54545,19.9091 1.63636,13.7273 -0.272727,8"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3666">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="anvil" x="29.7273" y="5.10572">
    <polygon points="-4.81818,-0.181818 -20.6364,-0.287536 -24.4545,2.38852 -29.7273,2.88276 -29.9091,5.21061 -27.0909,9.72563 -23.9091,11.2838 -24.0909,22.8869 -4.18182,22.9852 -4.22727,14.1425 2.18182,7.66351 2.27273,4.10613"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3667">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="anvil" x="2.36364" y="5.63636">
    <polygon points="4.81818,-0.727273 20.4545,-0.636364 23.3182,1.5 29.6364,2.36364 29.9091,4.09091 27,7.81818 23.5455,9.36364 23.6364,20.2727 3.72727,20.3636 3.81818,11.5455 -2.27273,5.36364 -2.27273,3.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3668">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="anvil" x="30" y="5.63636">
    <polygon points="-4.81818,-0.727273 -20.4545,-0.636364 -23.3182,1.5 -29.6364,2.36364 -29.9091,4.09091 -27,7.81818 -23.5455,9.36364 -23.6364,20.2727 -3.72727,20.3636 -3.81818,11.5455 2.27273,5.36364 2.27273,3.18182"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3669">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="mount" x="0.75" y="16.75">
    <polygon points="0,0 1.25,1.125 5.125,1.25 5.25,7.75 6.5,9.125 9.125,9.5 9.125,13.25 11.5,15.25 19.375,15.375 21.375,12.875 21.375,9.375 24.5,9.5 25.5,7.875 24.875,1.25 29.875,1.125 30.25,-8.5 28.125,-13.875 26.125,-16 18.75,-16 18,-16.875 12.5,-16.875 11.125,-15.875 4,-15.875 2.375,-13.75 1.5,-11.5 0.5,-8.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3670">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="0,0 3.5,-4.25 11.125,-5 17,-5.125 25,-4.125 26.75,-1.875 28.25,0.5 28.25,3.25 22.25,7.75 22.125,11.75 17,15.875 20,21.875 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.25,22.25 11,15.5 6,11.75 5.875,7.375 0.125,3"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3671">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="mount" x="12.875" y="0">
    <polygon points="0,0 6,-0.25 7.375,1.625 8.875,1.75 12.375,3.875 13.625,6 14.875,8.75 15.25,13.625 11.125,15.75 11.375,22 9.25,25.875 9.375,29.75 7.25,32 -0.75,32 -2.875,29.875 -2.875,25.625 -4,24.625 -4.875,21.5 -4.875,15.375 -8.875,14.25 -8.625,9 -6.875,5 -4.5,3 -2.375,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3672">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="3.125,1.375 6.75,-1.875 11.125,-5 17,-5.125 19.375,-3.125 22.75,-1.25 25.125,1.375 25.25,4.5 21.625,7.75 21.5,11.875 16.5,16.125 16.625,19.875 20,20.75 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.625,21.875 11.6563,19.6875 11.3125,16 7.125,12.375 6.875,8.875 6,6.75 3.25,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3673">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="12.875" y="0">
    <polygon points="0,0 6,-0.25 7.375,1.625 8.875,1.75 12.375,3.875 13.625,6 14.875,8.75 15.25,13.625 11.125,15.75 11.375,22 9.25,25.875 9.375,29.75 7.25,32 -0.75,32 -2.875,29.875 -2.875,25.625 -4,24.625 -4.875,21.5 -4.875,15.375 -8.875,14.25 -8.625,9 -6.875,5 -4.5,3 -2.375,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3674">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="3.125,1.375 6.75,-1.875 11.125,-5 17,-5.125 19.375,-3.125 22.75,-1.25 25.125,1.375 25.25,4.5 21.625,7.75 21.5,11.875 16.5,16.125 16.625,19.875 20,20.75 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.625,21.875 11.6563,19.6875 11.3125,16 7.125,12.375 6.875,8.875 6,6.75 3.25,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3675">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="mount" x="0.75" y="16.75">
    <polygon points="0,0 1.25,1.125 5.125,1.25 5.25,7.75 6.5,9.125 9.125,9.5 9.125,13.25 11.5,15.25 19.375,15.375 21.375,12.875 21.375,9.375 24.5,9.5 25.5,7.875 24.875,1.25 29.875,1.125 30.25,-8.5 28.125,-13.875 26.125,-16 18.75,-16 18,-16.875 12.5,-16.875 11.125,-15.875 4,-15.875 2.375,-13.75 1.5,-11.5 0.5,-8.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3676">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="0,0 3.5,-4.25 11.125,-5 17,-5.125 25,-4.125 26.75,-1.875 28.25,0.5 28.25,3.25 22.25,7.75 22.125,11.75 17,15.875 20,21.875 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.25,22.25 11,15.5 6,11.75 5.875,7.375 0.125,3"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3677">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="12.875" y="0">
    <polygon points="0,0 6,-0.25 7.375,1.625 8.875,1.75 12.375,3.875 13.625,6 14.875,8.75 15.25,13.625 11.125,15.75 11.375,22 9.25,25.875 9.375,29.75 7.25,32 -0.75,32 -2.875,29.875 -2.875,25.625 -4,24.625 -4.875,21.5 -4.875,15.375 -8.875,14.25 -8.625,9 -6.875,5 -4.5,3 -2.375,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3678">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="3.125,1.375 6.75,-1.875 11.125,-5 17,-5.125 19.375,-3.125 22.75,-1.25 25.125,1.375 25.25,4.5 21.625,7.75 21.5,11.875 16.5,16.125 16.625,19.875 20,20.75 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.625,21.875 11.6563,19.6875 11.3125,16 7.125,12.375 6.875,8.875 6,6.75 3.25,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3679">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="12.875" y="0">
    <polygon points="0,0 6,-0.25 7.375,1.625 8.875,1.75 12.375,3.875 13.625,6 14.875,8.75 15.25,13.625 11.125,15.75 11.375,22 9.25,25.875 9.375,29.75 7.25,32 -0.75,32 -2.875,29.875 -2.875,25.625 -4,24.625 -4.875,21.5 -4.875,15.375 -8.875,14.25 -8.625,9 -6.875,5 -4.5,3 -2.375,2"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3680">
  <objectgroup>
   <object id="1" name="Container" type="mount" x="1.875" y="4.875">
    <polygon points="3.125,1.375 6.75,-1.875 11.125,-5 17,-5.125 19.375,-3.125 22.75,-1.25 25.125,1.375 25.25,4.5 21.625,7.75 21.5,11.875 16.5,16.125 16.625,19.875 20,20.75 20.125,25 18.375,27.375 10.375,27.25 8.25,25 8.625,21.875 11.6563,19.6875 11.3125,16 7.125,12.375 6.875,8.875 6,6.75 3.25,4"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3697">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3698">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3699">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Planter" type="wood" x="0" y="0" width="32" height="20"/>
  </objectgroup>
 </tile>
 <tile id="3700">
  <objectgroup>
   <object id="1" name="Planter" type="wood" x="0" y="0" width="32" height="20"/>
  </objectgroup>
 </tile>
 <tile id="3701">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="vase" x="3.25" y="0" width="25.75" height="17.25">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3702" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="4.125" y="12.625">
    <polygon points="0,0 5.625,0.125 25.75,3.5 25.875,11 24,19.5 -4.25,19.375 -4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3703" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="25.75" y="12.625">
    <polygon points="0,0 -5.625,0.125 -25.75,3.5 -25.875,11 -24,19.5 4.25,19.375 4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3704">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3705">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3706">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3707" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="16" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3708" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="16" width="26" height="16">
    <polygon points="2.5,-0.625 26,2.25 26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3709" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="19" width="30" height="13">
    <polygon points="0,0 30,2.875 29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3710" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="32" y="19" width="30" height="13">
    <polygon points="0,0 -30,2.875 -29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3711" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="16" width="26" height="16">
    <polygon points="-2.5,-0.625 -26,2.25 -26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3712" type="above"/>
 <tile id="3713" type="above"/>
 <tile id="3714" type="above"/>
 <tile id="3715" type="above"/>
 <tile id="3716" type="above"/>
 <tile id="3717" type="above"/>
 <tile id="3718" type="above"/>
 <tile id="3719" type="above"/>
 <tile id="3720">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="32" y="14.25">
    <polygon points="0,0 -10.75,2.125 -16.25,-0.375 -21.875,1.625 -22.125,-5.875 -20.25,-10.375 -20,-14.25 0.125,-14.5"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3721">
  <objectgroup>
   <object id="1" name="Mound" type="coal" x="0" y="0" width="32" height="20.125">
    <polygon points="0,0 32,0 32.125,18.25 15.0625,17.4375 -0.125,14.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3722">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="32" y="0" width="32" height="20.125">
    <polygon points="0,0 -32,0 -32.125,18.25 -15.0625,17.4375 0.125,14.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3723">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="12.25" y="0.125">
    <polygon points="0,0 2.125,8.625 9.625,10.75 9.625,14 6.625,17.625 -2.625,18.125 -3.375,19.875 -12,18.5 -12.125,-0.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3724">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="20.75" y="0.25">
    <polygon points="0,0 -1,2.25 -3.5,3.625 -3.875,9 -4.625,9.875 -4.75,17.25 1.125,17.75 1.125,19.25 3.375,21.75 4.5,21.75 6.25,18.75 11.25,18.75 11.25,-0.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3725">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="32" y="0" width="32" height="20.125">
    <polygon points="0.125,0 -32,0 -32.125,18.875 -24.8438,18.9063 -15.3125,19.0625 -6.96875,15.4063 -6.92188,20.2031 0.125,18.625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3726">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="12.875" y="-0.125">
    <polygon points="0,0 2.125,4.875 2.375,12.375 1,18.125 -3.25,19.25 -3.875,21.125 -6,21.125 -7,19.625 -7,16.75 -12.75,19.25 -12.875,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3727" type="above"/>
 <tile id="3728" type="above"/>
 <tile id="3734">
  <animation>
   <frame tileid="3734" duration="200"/>
   <frame tileid="3736" duration="200"/>
   <frame tileid="3738" duration="200"/>
  </animation>
 </tile>
 <tile id="3735">
  <animation>
   <frame tileid="3735" duration="200"/>
   <frame tileid="3737" duration="200"/>
   <frame tileid="3739" duration="200"/>
  </animation>
 </tile>
 <tile id="3752" type="above"/>
 <tile id="3753" type="above"/>
 <tile id="3761" type="above"/>
 <tile id="3762" type="above"/>
 <tile id="3763" type="above"/>
 <tile id="3764" type="above"/>
 <tile id="3766">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="28" height="16">
    <polygon points="0,0 27.8182,-0.181818 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3767">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="29.9318" y="0" width="28" height="16">
    <polygon points="0,0 -27.8182,-0.181818 -27.9318,6.51136 -25.5,15.75 -14,14.875 -1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3768">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="-0.181818" y="16.1818" width="28" height="16">
    <polygon points="0,0 4.18182,-16.4545 10.3636,-16.5 30.4091,-12.8864 29,-2 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3769">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3770">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3771">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3772">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="0" width="26" height="19">
    <polygon points="0,0 26,0 26,19 1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3773">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="0" y="0" width="29.125" height="22">
    <polygon points="0,0 29.125,0 26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3774">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="32.125" y="0" width="29.125" height="22">
    <polygon points="0,0 -29.125,0 -26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3775">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="0" width="26" height="19">
    <polygon points="0,0 -26,0 -26,19 -1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3776" type="above"/>
 <tile id="3777" type="above"/>
 <tile id="3778" type="above"/>
 <tile id="3779" type="above"/>
 <tile id="3780" type="above"/>
 <tile id="3781" type="above"/>
 <tile id="3782" type="above"/>
 <tile id="3783" type="above"/>
 <tile id="3785" type="above"/>
 <tile id="3786" type="above"/>
 <tile id="3789" type="above"/>
 <tile id="3790" type="above"/>
 <tile id="3791">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="22.1818" y="0.181818">
    <polygon points="0.545455,0 -3.27273,5 -3.27273,9.45455 1.18182,12.3636 7.09091,14.0909 9.90909,14.0909 10,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3792">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="10.0909" y="-0.0909091">
    <polygon points="0,0 4.81818,5 4.63636,7.27273 -1.18182,12.3636 -7.36364,15.1818 -10.0909,15.0909 -10,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3793">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3794">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="26.1901">
    <polygon points="0,0 31.9922,0 31.9922,26.1901 0,26.1901"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3795">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="wetstone" x="0.0909091" y="9" width="31.9091" height="21.6364">
    <polygon points="0.0909091,-3.55271e-15 4.10795,-0.25 6.21591,-3.86364 8.27841,-5.88636 11.7955,-7.90909 19.9545,-7.81818 23.9205,-5.63636 26.6136,-2.36364 27.5341,-0.0909091 31.9091,0 31.9091,21.9091 2.77556e-17,22"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3795" duration="200"/>
   <frame tileid="3796" duration="200"/>
   <frame tileid="3797" duration="200"/>
  </animation>
 </tile>
 <tile id="3796">
  <objectgroup>
   <object id="1" name="Tool" type="wetstone" x="0.0909091" y="9" width="31.9091" height="21.6364">
    <polygon points="0.0909091,-3.55271e-15 4.10795,-0.25 6.21591,-3.86364 8.27841,-5.88636 11.7955,-7.90909 19.9545,-7.81818 23.9205,-5.63636 26.6136,-2.36364 27.5341,-0.0909091 31.9091,0 31.9091,21.9091 2.77556e-17,22"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3797">
  <objectgroup>
   <object id="1" name="Tool" type="wetstone" x="0.0909091" y="9" width="31.9091" height="21.6364">
    <polygon points="0.0909091,-3.55271e-15 4.10795,-0.25 6.21591,-3.86364 8.27841,-5.88636 11.7955,-7.90909 19.9545,-7.81818 23.9205,-5.63636 26.6136,-2.36364 27.5341,-0.0909091 31.9091,0 31.9091,21.9091 2.77556e-17,22"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3798">
  <animation>
   <frame tileid="3798" duration="200"/>
   <frame tileid="3800" duration="200"/>
   <frame tileid="3802" duration="200"/>
  </animation>
 </tile>
 <tile id="3799">
  <animation>
   <frame tileid="3799" duration="200"/>
   <frame tileid="3801" duration="200"/>
   <frame tileid="3803" duration="200"/>
  </animation>
 </tile>
 <tile id="3820" type="fire"/>
 <tile id="3821" type="fire"/>
 <tile id="3822" type="fire"/>
 <tile id="3823" type="fire"/>
 <tile id="3825">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3826">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3827">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3828">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3829">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="box" x="4.67229" y="5.74583" width="19.3899" height="23.3833">
    <polygon points="0,0 19.3899,0 19.3899,23.3833 0,23.3833"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3830" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="4.125" y="12.625">
    <polygon points="0,0 5.625,0.125 25.75,3.5 25.875,11 24,19.5 -4.25,19.375 -4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3831" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="25.75" y="12.625">
    <polygon points="0,0 -5.625,0.125 -25.75,3.5 -25.875,11 -24,19.5 4.25,19.375 4.25,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3832">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3833">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3834">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3835" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="16" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3836" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="16" width="26" height="16">
    <polygon points="2.5,-0.625 26,2.25 26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3837" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="19" width="30" height="13">
    <polygon points="0,0 30,2.875 29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3838" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="32" y="19" width="30" height="13">
    <polygon points="0,0 -30,2.875 -29.25,13 0,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3839" type="above">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="16" width="26" height="16">
    <polygon points="-2.5,-0.625 -26,2.25 -26,16 0,16"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3841">
  <animation>
   <frame tileid="3841" duration="200"/>
   <frame tileid="3842" duration="200"/>
   <frame tileid="3845" duration="200"/>
   <frame tileid="3846" duration="200"/>
  </animation>
 </tile>
 <tile id="3849">
  <objectgroup draworder="index" id="2">
   <object id="1" x="32.1875" y="0" width="28" height="20">
    <polygon points="0,0 -16.125,0 -17.375,4.5 -21.1875,5.75 -21.2188,12.625 -19.6719,14 -16.2852,14.375 -15.2793,16.6875 -12.3984,17.375 -6.625,18.75 -4.75,15.125 0,14.8125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3850">
  <objectgroup draworder="index" id="2">
   <object id="1" x="0" y="0" width="28" height="20">
    <polygon points="0,0 18.375,0 18.875,3 25.4375,3 25.3438,11 23.0469,16.25 9.52344,19 9,15.5 0,15.375"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3853">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="6.90909" y="0">
    <polygon points="0,0 -2.81818,2 -2.90909,5.81818 -3.81818,8.18182 -3.90909,15.9091 1.90909,16 2.81818,18.8182 5.63636,18.9091 8.18182,16.8182 15.7273,17.9091 25,16 25.1818,0"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3854">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Mound" type="coal" x="29" y="-0.0909091">
    <polygon points="0,0 0.181818,10.9091 -1,16.0909 -5.81818,18.0909 -19.9091,18.0909 -20.1818,13.9091 -29,16.2727 -29,-0.0909091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3856">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="22.0909" width="31.9091" height="9.90909"/>
  </objectgroup>
  <animation>
   <frame tileid="3856" duration="200"/>
   <frame tileid="3858" duration="200"/>
   <frame tileid="3860" duration="200"/>
  </animation>
 </tile>
 <tile id="3857">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="25" width="31.9091" height="7"/>
  </objectgroup>
  <animation>
   <frame tileid="3857" duration="200"/>
   <frame tileid="3859" duration="200"/>
   <frame tileid="3861" duration="200"/>
  </animation>
 </tile>
 <tile id="3858">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="22.0909" width="31.9091" height="9.90909"/>
  </objectgroup>
 </tile>
 <tile id="3859">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="25" width="31.9091" height="7"/>
  </objectgroup>
 </tile>
 <tile id="3860">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="22.0909" width="31.9091" height="9.90909"/>
  </objectgroup>
 </tile>
 <tile id="3861">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0909091" y="25" width="31.9091" height="7"/>
  </objectgroup>
 </tile>
 <tile id="3864">
  <animation>
   <frame tileid="3864" duration="200"/>
   <frame tileid="3866" duration="200"/>
  </animation>
 </tile>
 <tile id="3865">
  <animation>
   <frame tileid="3865" duration="200"/>
   <frame tileid="3867" duration="200"/>
  </animation>
 </tile>
 <tile id="3880" type="above"/>
 <tile id="3881" type="above"/>
 <tile id="3882" type="above"/>
 <tile id="3883" type="above"/>
 <tile id="3884" type="above"/>
 <tile id="3885" type="above"/>
 <tile id="3886" type="above"/>
 <tile id="3889" type="above"/>
 <tile id="3890" type="above"/>
 <tile id="3891" type="above"/>
 <tile id="3892">
  <objectgroup>
   <object id="1" name="Container" type="box" x="3.92229" y="-0.00416667" width="24.2649" height="32.0083">
    <polygon points="0,0 24.2649,0 24.2649,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3893">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="box" x="7.67229" y="4.99583" width="16.2649" height="22.1333">
    <polygon points="0,0 16.2649,0 16.2649,22.1333 0,22.1333"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3894">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="28" height="16">
    <polygon points="0,0 27.8182,-0.181818 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3895">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="29.9318" y="0" width="28" height="16">
    <polygon points="0,0 -27.8182,-0.181818 -27.9318,6.51136 -25.5,15.75 -14,14.875 -1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3896">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="-0.181818" y="16.1818" width="28" height="16">
    <polygon points="0,0 4.18182,-16.4545 10.3636,-16.5 30.4091,-12.8864 29,-2 27.9318,6.51136 25.5,15.75 14,14.875 1.875,13"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3897">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3898">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="2" y="0" width="28" height="32"/>
  </objectgroup>
 </tile>
 <tile id="3899">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="0" y="0" width="32" height="16"/>
  </objectgroup>
 </tile>
 <tile id="3900">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="6" y="0" width="26" height="19">
    <polygon points="0,0 26,0 26,19 1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3901">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="0" y="0" width="29.125" height="22">
    <polygon points="0,0 29.125,0 26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3902">
  <objectgroup>
   <object id="1" name=" Container" type="trough" x="32.125" y="0" width="29.125" height="22">
    <polygon points="0,0 -29.125,0 -26.375,22 0,18.875"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3903">
  <objectgroup>
   <object id="1" name="Container" type="trough" x="26" y="0" width="26" height="19">
    <polygon points="0,0 -26,0 -26,19 -1.875,16.25"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3904">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3905">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3906">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3907">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3908">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3909">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3910">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3911">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3912">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3912" duration="200"/>
   <frame tileid="3916" duration="200"/>
  </animation>
 </tile>
 <tile id="3913">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3913" duration="200"/>
   <frame tileid="3917" duration="200"/>
  </animation>
 </tile>
 <tile id="3914">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3914" duration="200"/>
   <frame tileid="3918" duration="200"/>
  </animation>
 </tile>
 <tile id="3915">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3915" duration="200"/>
   <frame tileid="3919" duration="200"/>
  </animation>
 </tile>
 <tile id="3916">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3917">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3918">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3919">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3920">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3920" duration="200"/>
   <frame tileid="3922" duration="200"/>
   <frame tileid="3924" duration="200"/>
  </animation>
 </tile>
 <tile id="3921">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="26.1901">
    <polygon points="0,0 31.9922,0 31.9922,26.1901 0,26.1901"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3921" duration="200"/>
   <frame tileid="3923" duration="200"/>
   <frame tileid="3925" duration="200"/>
  </animation>
 </tile>
 <tile id="3922">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3923">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="26.1901">
    <polygon points="0,0 31.9922,0 31.9922,26.1901 0,26.1901"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3924">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3925">
  <objectgroup>
   <object id="1" name="Tool" type="smelter" x="0.0131944" y="-0.00416667" width="31.9922" height="26.1901">
    <polygon points="0,0 31.9922,0 31.9922,26.1901 0,26.1901"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3928">
  <animation>
   <frame tileid="3928" duration="200"/>
   <frame tileid="3930" duration="200"/>
  </animation>
 </tile>
 <tile id="3929">
  <animation>
   <frame tileid="3929" duration="200"/>
   <frame tileid="3931" duration="200"/>
  </animation>
 </tile>
 <tile id="3947">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="-0.181818" y="-0.181818">
    <polygon points="0,0 0.363636,5.90909 1,9.81818 2.27273,12.8182 3.18182,15 4.09091,16.7273 6.54545,20 14.3636,27.0909 19.5455,30.3636 32.1818,30.3636 32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3948">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="32" y="-0.181818">
    <polygon points="0,0 -0.363636,5.90909 -1,9.81818 -2.27273,12.8182 -3.18182,15 -4.09091,16.7273 -6.54545,20 -14.3636,27.0909 -19.5455,30.3636 -32.1818,30.3636 -32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3949">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="-0.181818" y="-0.181818">
    <polygon points="0,0 0.363636,5.90909 1,9.81818 2.27273,12.8182 3.18182,15 4.09091,16.7273 6.54545,20 14.3636,27.0909 19.5455,30.3636 32.1818,30.3636 32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3950">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="32" y="-0.181818">
    <polygon points="0,0 -0.363636,5.90909 -1,9.81818 -2.27273,12.8182 -3.18182,15 -4.09091,16.7273 -6.54545,20 -14.3636,27.0909 -19.5455,30.3636 -32.1818,30.3636 -32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3951" type="above"/>
 <tile id="3952" type="above"/>
 <tile id="3953">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3954">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3955">
  <objectgroup>
   <object id="1" name="Container" type="vase" x="7.25" y="0" width="17.625" height="14.375">
    <ellipse/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3956">
  <objectgroup draworder="index" id="2">
   <object id="2" name="Container" type="box" x="0" y="0" width="32" height="32">
    <polygon points="0,7.5 16,0 32,7.125 31.875,24.25 16,32 0.125,25.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3957">
  <objectgroup>
   <object id="1" name="Container" type="box" x="0" y="0" width="32" height="32">
    <polygon points="0,7.5 16,0 32,7.125 31.875,24.25 16,32 0.125,25.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3958">
  <objectgroup>
   <object id="1" name="Container" type="box" x="5.125" y="4.25" width="22" height="25.375">
    <polygon points="0,5.94727 11,0 22,5.6499 21.9141,19.2295 11,25.375 0.0859375,19.9233"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3959">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3960">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3961">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3962">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3963">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cauldron" type="unlit" x="11.0909" y="0.818182">
    <polygon points="0,0 15,0.0909091 16.7273,2.09091 18.7273,5.18182 18.9091,19.1818 18,25.7273 15.8182,28.5455 -1.81818,30.2727 -7.18182,24.8182 -8.18182,18.4545 -8.09091,5.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3964">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Cauldron" type="unlit" x="10.266" y="0.818182">
    <polygon points="0,0 15.6544,0.0909091 17.457,2.09091 19.5442,5.18182 19.734,19.1818 18.7852,25.7273 16.5082,28.5455 -1.8975,30.2727 -7.49512,24.8182 -8.53874,18.4545 -8.44387,5.09091"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3964" duration="200"/>
   <frame tileid="3965" duration="200"/>
   <frame tileid="3966" duration="200"/>
   <frame tileid="3967" duration="200"/>
  </animation>
 </tile>
 <tile id="3965">
  <objectgroup>
   <object id="1" name="Cauldron" type="unlit" x="10.266" y="0.818182">
    <polygon points="0,0 15.6544,0.0909091 17.457,2.09091 19.5442,5.18182 19.734,19.1818 18.7852,25.7273 16.5082,28.5455 -1.8975,30.2727 -7.49512,24.8182 -8.53874,18.4545 -8.44387,5.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3966">
  <objectgroup>
   <object id="1" name="Cauldron" type="unlit" x="10.266" y="0.818182">
    <polygon points="0,0 15.6544,0.0909091 17.457,2.09091 19.5442,5.18182 19.734,19.1818 18.7852,25.7273 16.5082,28.5455 -1.8975,30.2727 -7.49512,24.8182 -8.53874,18.4545 -8.44387,5.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3967">
  <objectgroup>
   <object id="1" name="Cauldron" type="unlit" x="10.266" y="0.818182">
    <polygon points="0,0 15.6544,0.0909091 17.457,2.09091 19.5442,5.18182 19.734,19.1818 18.7852,25.7273 16.5082,28.5455 -1.8975,30.2727 -7.49512,24.8182 -8.53874,18.4545 -8.44387,5.09091"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3968">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3969">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3970">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3971">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3972">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3973">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3974">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3975">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3976">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3976" duration="200"/>
   <frame tileid="3980" duration="200"/>
  </animation>
 </tile>
 <tile id="3977">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fire" type="furnace" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3977" duration="200"/>
   <frame tileid="3981" duration="200"/>
  </animation>
 </tile>
 <tile id="3978">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Fire" type="furnace" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3978" duration="200"/>
   <frame tileid="3982" duration="200"/>
  </animation>
 </tile>
 <tile id="3979">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
  <animation>
   <frame tileid="3979" duration="200"/>
   <frame tileid="3983" duration="200"/>
  </animation>
 </tile>
 <tile id="3980">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3981">
  <objectgroup>
   <object id="1" name="Fire" type="furnace" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3982">
  <objectgroup>
   <object id="1" name="Fire" type="furnace" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3983">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3984">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3985">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3986">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3987">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3988">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3989">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3990">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3991">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="3999">
  <objectgroup>
   <object id="1" name="Slab" type="stone" x="0.181818" y="0.227277" width="22.8182" height="16.0909">
    <polygon points="0,0 22.8182,0 22.8182,16.0909 0,16.0909"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4008" type="above"/>
 <tile id="4009" type="above"/>
 <tile id="4010" type="above"/>
 <tile id="4011" type="above"/>
 <tile id="4012" type="above"/>
 <tile id="4013" type="above"/>
 <tile id="4014" type="above"/>
 <tile id="4015" type="above"/>
 <tile id="4016" type="above"/>
 <tile id="4017" type="above"/>
 <tile id="4018" type="above"/>
 <tile id="4019" type="above"/>
 <tile id="4020">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="box" x="3.92229" y="-0.00416667" width="24.2649" height="32.0083">
    <polygon points="0,0 24.2649,0 24.2649,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4021">
  <objectgroup>
   <object id="1" name="Container" type="box" x="7.67229" y="4.99583" width="16.2649" height="22.1333">
    <polygon points="0,0 16.2649,0 16.2649,22.1333 0,22.1333"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4022">
  <objectgroup>
   <object id="1" name="Container" type="box" x="4.67229" y="5.74583" width="19.3899" height="23.3833">
    <polygon points="0,0 19.3899,0 19.3899,23.3833 0,23.3833"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4023">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4024">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4025">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4026">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4027" type="above"/>
 <tile id="4028" type="above"/>
 <tile id="4029" type="above"/>
 <tile id="4030" type="above"/>
 <tile id="4031" type="above"/>
 <tile id="4032">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="wall" x="0" y="0.0909091">
    <polygon points="0,0 32.0909,0 32.1818,27.9091 25,25.9091 20.1818,23.8182 15.9091,21.8182 11.6364,18.1818 9.72727,17.8182 3.09091,10.5455 0.909091,6.63636 -0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4033">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4034">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4035">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Collision" type="wall" x="32" y="0.0909091">
    <polygon points="0,0 -32.0909,0 -32.1818,27.9091 -25,25.9091 -20.1818,23.8182 -15.9091,21.8182 -11.6364,18.1818 -9.72727,17.8182 -3.09091,10.5455 -0.909091,6.63636 0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4036">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0" y="0.0909091">
    <polygon points="0,0 32.0909,0 32.1818,27.9091 25,25.9091 20.1818,23.8182 15.9091,21.8182 11.6364,18.1818 9.72727,17.8182 3.09091,10.5455 0.909091,6.63636 -0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4037">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4038">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4039">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="32" y="0.0909091">
    <polygon points="0,0 -32.0909,0 -32.1818,27.9091 -25,25.9091 -20.1818,23.8182 -15.9091,21.8182 -11.6364,18.1818 -9.72727,17.8182 -3.09091,10.5455 -0.909091,6.63636 0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4040">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0" y="0.0909091">
    <polygon points="0,0 32.0909,0 32.1818,27.9091 25,25.9091 20.1818,23.8182 15.9091,21.8182 11.6364,18.1818 9.72727,17.8182 3.09091,10.5455 0.909091,6.63636 -0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4041">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4042">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4043">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="32" y="0.0909091">
    <polygon points="0,0 -32.0909,0 -32.1818,27.9091 -25,25.9091 -20.1818,23.8182 -15.9091,21.8182 -11.6364,18.1818 -9.72727,17.8182 -3.09091,10.5455 -0.909091,6.63636 0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4044">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0" y="0.0909091">
    <polygon points="0,0 32.0909,0 32.1818,27.9091 25,25.9091 20.1818,23.8182 15.9091,21.8182 11.6364,18.1818 9.72727,17.8182 3.09091,10.5455 0.909091,6.63636 -0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4045">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4046">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4047">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="32" y="0.0909091">
    <polygon points="0,0 -32.0909,0 -32.1818,27.9091 -25,25.9091 -20.1818,23.8182 -15.9091,21.8182 -11.6364,18.1818 -9.72727,17.8182 -3.09091,10.5455 -0.909091,6.63636 0.181818,3.45455"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4048">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4049">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4050">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4051">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4052">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4053">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4054">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4055">
  <objectgroup>
   <object id="1" name="Collision" type="wall" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4075">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Statue" type="wolf" x="-0.181818" y="-0.181818">
    <polygon points="0,0 0.363636,5.90909 1,9.81818 2.27273,12.8182 3.18182,15 4.09091,16.7273 6.54545,20 14.3636,27.0909 19.5455,30.3636 32.1818,30.3636 32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4076">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Statue" type="wolf" x="32" y="-0.181818">
    <polygon points="0,0 -0.363636,5.90909 -1,9.81818 -2.27273,12.8182 -3.18182,15 -4.09091,16.7273 -6.54545,20 -14.3636,27.0909 -19.5455,30.3636 -32.1818,30.3636 -32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4077">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="-0.181818" y="-0.181818">
    <polygon points="0,0 0.363636,5.90909 1,9.81818 2.27273,12.8182 3.18182,15 4.09091,16.7273 6.54545,20 14.3636,27.0909 19.5455,30.3636 32.1818,30.3636 32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4078">
  <objectgroup>
   <object id="1" name="Statue" type="wolf" x="32" y="-0.181818">
    <polygon points="0,0 -0.363636,5.90909 -1,9.81818 -2.27273,12.8182 -3.18182,15 -4.09091,16.7273 -6.54545,20 -14.3636,27.0909 -19.5455,30.3636 -32.1818,30.3636 -32.1818,0.181818"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4079">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Object" type="lamp" x="11.0909" y="4.18182" width="9.90909" height="15.6364"/>
  </objectgroup>
 </tile>
 <tile id="4080">
  <objectgroup>
   <object id="1" name="Object" type="lamp" x="11.0909" y="4.18182" width="9.90909" height="15.6364"/>
  </objectgroup>
 </tile>
 <tile id="4084">
  <objectgroup>
   <object id="1" name="Container" type="box" x="0" y="0" width="32" height="32">
    <polygon points="0,7.5 16,0 32,7.125 31.875,24.25 16,32 0.125,25.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4085">
  <objectgroup>
   <object id="1" name="Container" type="box" x="0" y="0" width="32" height="32">
    <polygon points="0,7.5 16,0 32,7.125 31.875,24.25 16,32 0.125,25.125"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4086">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="box" x="5.125" y="4.25" width="22" height="25.375">
    <polygon points="0,5.94727 11,0 22,5.6499 21.9141,19.2295 11,25.375 0.0859375,19.9233"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4087">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4088">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="0.0131944" y="-0.00416667" width="31.9922" height="32.0083">
    <polygon points="0,0 31.9922,0 31.9922,32.0083 0,32.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4089">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4090">
  <objectgroup>
   <object id="1" name="Container" type="chest" x="1.92229" y="-0.00416667" width="27.9922" height="27.0083">
    <polygon points="0,0 27.9922,0 27.9922,27.0083 0,27.0083"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4091">
  <objectgroup draworder="index" id="2">
   <object id="1" name="Container" type="barrel" x="3" y="0" width="26" height="15">
    <polygon points="0,0 26,0 26,6.125 22.5,12.875 13,15 3.875,13.125 0,6"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4092">
  <objectgroup>
   <object id="1" name="Container" type="barrel" x="3" y="0" width="26" height="15">
    <polygon points="0,0 26,0 26,6.125 22.5,12.875 13,15 3.875,13.125 0,6"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4093">
  <objectgroup>
   <object id="1" name="Container" type="barrel" x="3" y="0" width="26" height="15">
    <polygon points="0,0 26,0 26,6.125 22.5,12.875 13,15 3.875,13.125 0,6"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4094">
  <objectgroup draworder="index" id="2">
   <object id="1" x="0" y="0" width="32" height="29.875">
    <polygon points="0,0 32,0 32,29.875 24.125,29.1719 18.75,25.2188 16.75,18.0625 10.5,18 4.375,15.4688 1.5,9.5625"/>
   </object>
  </objectgroup>
 </tile>
 <tile id="4095">
  <objectgroup draworder="index" id="2">
   <object id="1" x="0" y="0" width="14.125" height="30.125">
    <polygon points="0,0 14.125,0 11.7813,4.57813 11.75,20.3125 8.875,26.875 0,30.125"/>
   </object>
  </objectgroup>
 </tile>
 <wangsets>
  <wangset name="Summer Terrain" type="corner" tile="6">
   <wangcolor name="Grass" class="grass" color="#d8faff" tile="6" probability="1"/>
   <wangcolor name="Sand" class="dirt" color="#efc176" tile="9" probability="1"/>
   <wangcolor name="Dirt" class="dirt" color="#00ffff" tile="195" probability="1"/>
   <wangcolor name="Light Till" class="dirt" color="#aaffff" tile="205" probability="1"/>
   <wangcolor name="Deep Till" class="dirt" color="#609090" tile="526" probability="1"/>
   <wangcolor name="Shallow Water" class="water" color="#11aad5" tile="1153" probability="1"/>
   <wangcolor name="Deep Water" class="water_deep" color="#00007f" tile="1985" probability="1"/>
   <wangcolor name="Melted Ice" class="water" color="#aaffff" tile="1298" probability="1"/>
   <wangcolor name="Deep Sand" class="dirt" color="#eb951c" tile="267" probability="1"/>
   <wangcolor name="Mountain" color="#b8d6bd" tile="17" probability="1"/>
   <wangcolor name="Grassy Mountain" color="#d2ff9e" tile="337" probability="1"/>
   <wangcolor name="Vine" color="#96ffa7" tile="785" probability="1"/>
   <wangtile tileid="0" wangid="0,0,0,1,0,0,0,0"/>
   <wangtile tileid="1" wangid="0,0,0,1,0,1,0,0"/>
   <wangtile tileid="2" wangid="0,0,0,0,0,1,0,0"/>
   <wangtile tileid="6" wangid="0,3,0,1,0,3,0,3"/>
   <wangtile tileid="7" wangid="0,3,0,1,0,1,0,3"/>
   <wangtile tileid="8" wangid="0,3,0,3,0,1,0,3"/>
   <wangtile tileid="9" wangid="0,3,0,2,0,3,0,3"/>
   <wangtile tileid="10" wangid="0,3,0,2,0,2,0,3"/>
   <wangtile tileid="11" wangid="0,3,0,3,0,2,0,3"/>
   <wangtile tileid="12" wangid="0,2,0,3,0,2,0,2"/>
   <wangtile tileid="13" wangid="0,2,0,2,0,3,0,2"/>
   <wangtile tileid="14" wangid="0,9,0,2,0,9,0,9"/>
   <wangtile tileid="15" wangid="0,9,0,9,0,2,0,9"/>
   <wangtile tileid="16" wangid="0,10,0,10,0,0,0,0"/>
   <wangtile tileid="17" wangid="0,0,0,10,0,0,0,0"/>
   <wangtile tileid="18" wangid="0,0,0,10,0,10,0,0"/>
   <wangtile tileid="19" wangid="0,0,0,0,0,10,0,0"/>
   <wangtile tileid="20" wangid="0,0,0,0,0,10,0,10"/>
   <wangtile tileid="21" wangid="0,0,0,10,0,10,0,10"/>
   <wangtile tileid="22" wangid="0,10,0,10,0,10,0,0"/>
   <wangtile tileid="64" wangid="0,1,0,1,0,0,0,0"/>
   <wangtile tileid="65" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="66" wangid="0,0,0,0,0,1,0,1"/>
   <wangtile tileid="67" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="68" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="69" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="70" wangid="0,1,0,1,0,3,0,3"/>
   <wangtile tileid="72" wangid="0,3,0,3,0,1,0,1"/>
   <wangtile tileid="73" wangid="0,2,0,2,0,3,0,3"/>
   <wangtile tileid="74" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="75" wangid="0,3,0,3,0,2,0,2"/>
   <wangtile tileid="76" wangid="0,3,0,2,0,2,0,2"/>
   <wangtile tileid="77" wangid="0,2,0,2,0,2,0,3"/>
   <wangtile tileid="78" wangid="0,2,0,9,0,9,0,9"/>
   <wangtile tileid="79" wangid="0,9,0,9,0,9,0,2"/>
   <wangtile tileid="80" wangid="0,10,0,0,0,0,0,0"/>
   <wangtile tileid="81" wangid="0,10,0,10,0,0,0,10"/>
   <wangtile tileid="82" wangid="0,10,0,10,0,10,0,10"/>
   <wangtile tileid="83" wangid="0,10,0,0,0,10,0,10"/>
   <wangtile tileid="84" wangid="0,0,0,0,0,0,0,10"/>
   <wangtile tileid="85" wangid="0,0,0,10,0,0,0,0"/>
   <wangtile tileid="86" wangid="0,0,0,0,0,10,0,0"/>
   <wangtile tileid="128" wangid="0,1,0,0,0,0,0,0"/>
   <wangtile tileid="129" wangid="0,1,0,0,0,0,0,1"/>
   <wangtile tileid="130" wangid="0,0,0,0,0,0,0,1"/>
   <wangtile tileid="131" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="132" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="133" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="134" wangid="0,1,0,3,0,3,0,3"/>
   <wangtile tileid="135" wangid="0,1,0,3,0,3,0,1"/>
   <wangtile tileid="136" wangid="0,3,0,3,0,3,0,1"/>
   <wangtile tileid="137" wangid="0,2,0,3,0,3,0,3"/>
   <wangtile tileid="138" wangid="0,2,0,3,0,3,0,2"/>
   <wangtile tileid="139" wangid="0,3,0,3,0,3,0,2"/>
   <wangtile tileid="140" wangid="0,0,0,4,0,0,0,0"/>
   <wangtile tileid="141" wangid="0,0,0,4,0,4,0,0"/>
   <wangtile tileid="142" wangid="0,0,0,0,0,4,0,0"/>
   <wangtile tileid="145" wangid="0,10,0,0,0,0,0,0"/>
   <wangtile tileid="146" wangid="0,10,0,0,0,0,0,10"/>
   <wangtile tileid="147" wangid="0,0,0,0,0,0,0,10"/>
   <wangtile tileid="149" wangid="0,10,0,0,0,0,0,0"/>
   <wangtile tileid="150" wangid="0,0,0,0,0,0,0,10"/>
   <wangtile tileid="195" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="196" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="197" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="198" wangid="0,1,0,3,0,1,0,1"/>
   <wangtile tileid="199" wangid="0,1,0,1,0,3,0,1"/>
   <wangtile tileid="201" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="202" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="203" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="204" wangid="0,4,0,4,0,0,0,0"/>
   <wangtile tileid="205" wangid="0,4,0,4,0,4,0,4"/>
   <wangtile tileid="206" wangid="0,0,0,0,0,4,0,4"/>
   <wangtile tileid="207" wangid="0,5,0,0,0,5,0,0"/>
   <wangtile tileid="257" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="259" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="260" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="261" wangid="0,3,0,3,0,3,0,3"/>
   <wangtile tileid="262" wangid="0,3,0,1,0,1,0,1"/>
   <wangtile tileid="263" wangid="0,1,0,1,0,1,0,3"/>
   <wangtile tileid="265" wangid="0,9,0,9,0,9,0,9"/>
   <wangtile tileid="266" wangid="0,9,0,9,0,9,0,9"/>
   <wangtile tileid="267" wangid="0,9,0,9,0,9,0,9"/>
   <wangtile tileid="268" wangid="0,4,0,0,0,0,0,0"/>
   <wangtile tileid="269" wangid="0,4,0,0,0,0,0,4"/>
   <wangtile tileid="270" wangid="0,0,0,0,0,0,0,4"/>
   <wangtile tileid="271" wangid="0,0,0,5,0,0,0,5"/>
   <wangtile tileid="326" wangid="0,2,0,1,0,2,0,2"/>
   <wangtile tileid="327" wangid="0,2,0,1,0,1,0,2"/>
   <wangtile tileid="328" wangid="0,2,0,2,0,1,0,2"/>
   <wangtile tileid="329" wangid="0,2,0,9,0,2,0,2"/>
   <wangtile tileid="330" wangid="0,2,0,9,0,9,0,2"/>
   <wangtile tileid="331" wangid="0,2,0,2,0,9,0,2"/>
   <wangtile tileid="332" wangid="0,4,0,0,0,4,0,4"/>
   <wangtile tileid="333" wangid="0,4,0,4,0,0,0,4"/>
   <wangtile tileid="334" wangid="0,5,0,0,0,5,0,5"/>
   <wangtile tileid="335" wangid="0,5,0,5,0,0,0,5"/>
   <wangtile tileid="336" wangid="0,11,0,11,0,0,0,0"/>
   <wangtile tileid="337" wangid="0,0,0,11,0,0,0,0"/>
   <wangtile tileid="338" wangid="0,0,0,11,0,11,0,0"/>
   <wangtile tileid="339" wangid="0,0,0,0,0,11,0,0"/>
   <wangtile tileid="340" wangid="0,0,0,0,0,11,0,11"/>
   <wangtile tileid="341" wangid="0,0,0,11,0,11,0,11"/>
   <wangtile tileid="342" wangid="0,11,0,11,0,11,0,0"/>
   <wangtile tileid="384" wangid="0,1,0,0,0,1,0,1"/>
   <wangtile tileid="385" wangid="0,1,0,1,0,0,0,1"/>
   <wangtile tileid="388" wangid="0,1,0,2,0,1,0,1"/>
   <wangtile tileid="389" wangid="0,1,0,1,0,2,0,1"/>
   <wangtile tileid="390" wangid="0,1,0,1,0,2,0,2"/>
   <wangtile tileid="391" wangid="0,1,0,1,0,1,0,1"/>
   <wangtile tileid="392" wangid="0,2,0,2,0,1,0,1"/>
   <wangtile tileid="393" wangid="0,9,0,9,0,2,0,2"/>
   <wangtile tileid="394" wangid="0,9,0,9,0,9,0,9"/>
   <wangtile tileid="395" wangid="0,2,0,2,0,9,0,9"/>
   <wangtile tileid="396" wangid="0,0,0,4,0,4,0,4"/>
   <wangtile tileid="397" wangid="0,4,0,4,0,4,0,0"/>
   <wangtile tileid="398" wangid="0,0,0,5,0,5,0,5"/>
   <wangtile tileid="399" wangid="0,5,0,5,0,5,0,0"/>
   <wangtile tileid="400" wangid="0,11,0,0,0,0,0,0"/>
   <wangtile tileid="401" wangid="0,11,0,11,0,0,0,11"/>
   <wangtile tileid="402" wangid="0,11,0,11,0,11,0,11"/>
   <wangtile tileid="403" wangid="0,11,0,0,0,11,0,11"/>
   <wangtile tileid="404" wangid="0,0,0,0,0,0,0,11"/>
   <wangtile tileid="405" wangid="0,0,0,11,0,0,0,0"/>
   <wangtile tileid="406" wangid="0,0,0,0,0,11,0,0"/>
   <wangtile tileid="448" wangid="0,0,0,1,0,1,0,1"/>
   <wangtile tileid="449" wangid="0,1,0,1,0,1,0,0"/>
   <wangtile tileid="452" wangid="0,2,0,1,0,1,0,1"/>
   <wangtile tileid="453" wangid="0,1,0,1,0,1,0,2"/>
   <wangtile tileid="454" wangid="0,1,0,2,0,2,0,2"/>
   <wangtile tileid="455" wangid="0,1,0,2,0,2,0,1"/>
   <wangtile tileid="456" wangid="0,2,0,2,0,2,0,1"/>
   <wangtile tileid="457" wangid="0,9,0,2,0,2,0,2"/>
   <wangtile tileid="458" wangid="0,9,0,2,0,2,0,9"/>
   <wangtile tileid="459" wangid="0,2,0,2,0,2,0,9"/>
   <wangtile tileid="460" wangid="0,4,0,0,0,4,0,0"/>
   <wangtile tileid="461" wangid="0,0,0,5,0,0,0,0"/>
   <wangtile tileid="462" wangid="0,0,0,5,0,5,0,0"/>
   <wangtile tileid="463" wangid="0,0,0,0,0,5,0,0"/>
   <wangtile tileid="465" wangid="0,11,0,0,0,0,0,0"/>
   <wangtile tileid="466" wangid="0,11,0,0,0,0,0,11"/>
   <wangtile tileid="467" wangid="0,0,0,0,0,0,0,11"/>
   <wangtile tileid="469" wangid="0,11,0,0,0,0,0,0"/>
   <wangtile tileid="470" wangid="0,0,0,0,0,0,0,11"/>
   <wangtile tileid="524" wangid="0,0,0,4,0,0,0,4"/>
   <wangtile tileid="525" wangid="0,5,0,5,0,0,0,0"/>
   <wangtile tileid="526" wangid="0,5,0,5,0,5,0,5"/>
   <wangtile tileid="527" wangid="0,0,0,0,0,5,0,5"/>
   <wangtile tileid="589" wangid="0,5,0,0,0,0,0,0"/>
   <wangtile tileid="590" wangid="0,5,0,0,0,0,0,5"/>
   <wangtile tileid="591" wangid="0,0,0,0,0,0,0,5"/>
   <wangtile tileid="720" wangid="0,12,0,0,0,12,0,12"/>
   <wangtile tileid="721" wangid="0,12,0,12,0,0,0,12"/>
   <wangtile tileid="722" wangid="0,0,0,12,0,12,0,12"/>
   <wangtile tileid="723" wangid="0,12,0,12,0,12,0,0"/>
   <wangtile tileid="724" wangid="0,12,0,12,0,12,0,12"/>
   <wangtile tileid="784" wangid="0,0,0,12,0,0,0,0"/>
   <wangtile tileid="785" wangid="0,0,0,12,0,12,0,0"/>
   <wangtile tileid="786" wangid="0,0,0,0,0,12,0,0"/>
   <wangtile tileid="848" wangid="0,12,0,12,0,0,0,0"/>
   <wangtile tileid="849" wangid="0,12,0,12,0,12,0,12"/>
   <wangtile tileid="850" wangid="0,0,0,0,0,12,0,12"/>
   <wangtile tileid="912" wangid="0,12,0,0,0,0,0,0"/>
   <wangtile tileid="913" wangid="0,12,0,0,0,0,0,12"/>
   <wangtile tileid="914" wangid="0,0,0,0,0,0,0,12"/>
   <wangtile tileid="1088" wangid="0,1,0,6,0,1,0,1"/>
   <wangtile tileid="1089" wangid="0,1,0,6,0,6,0,1"/>
   <wangtile tileid="1090" wangid="0,1,0,1,0,6,0,1"/>
   <wangtile tileid="1094" wangid="0,3,0,6,0,3,0,3"/>
   <wangtile tileid="1095" wangid="0,3,0,6,0,6,0,3"/>
   <wangtile tileid="1096" wangid="0,3,0,3,0,6,0,3"/>
   <wangtile tileid="1152" wangid="0,6,0,6,0,1,0,1"/>
   <wangtile tileid="1153" wangid="0,6,0,6,0,6,0,6"/>
   <wangtile tileid="1154" wangid="0,1,0,1,0,6,0,6"/>
   <wangtile tileid="1158" wangid="0,6,0,6,0,3,0,3"/>
   <wangtile tileid="1160" wangid="0,3,0,3,0,6,0,6"/>
   <wangtile tileid="1168" wangid="0,8,0,6,0,8,0,8"/>
   <wangtile tileid="1169" wangid="0,8,0,6,0,6,0,8"/>
   <wangtile tileid="1170" wangid="0,8,0,8,0,6,0,8"/>
   <wangtile tileid="1216" wangid="0,6,0,1,0,1,0,1"/>
   <wangtile tileid="1217" wangid="0,6,0,1,0,1,0,6"/>
   <wangtile tileid="1218" wangid="0,1,0,1,0,1,0,6"/>
   <wangtile tileid="1222" wangid="0,6,0,3,0,3,0,3"/>
   <wangtile tileid="1223" wangid="0,6,0,3,0,3,0,6"/>
   <wangtile tileid="1224" wangid="0,3,0,3,0,3,0,6"/>
   <wangtile tileid="1232" wangid="0,6,0,6,0,8,0,8"/>
   <wangtile tileid="1233" wangid="0,6,0,6,0,6,0,6"/>
   <wangtile tileid="1234" wangid="0,8,0,8,0,6,0,6"/>
   <wangtile tileid="1280" wangid="0,6,0,1,0,6,0,6"/>
   <wangtile tileid="1281" wangid="0,6,0,6,0,1,0,6"/>
   <wangtile tileid="1284" wangid="0,6,0,3,0,6,0,6"/>
   <wangtile tileid="1285" wangid="0,6,0,6,0,3,0,6"/>
   <wangtile tileid="1296" wangid="0,6,0,8,0,8,0,8"/>
   <wangtile tileid="1297" wangid="0,6,0,8,0,8,0,6"/>
   <wangtile tileid="1298" wangid="0,8,0,8,0,8,0,6"/>
   <wangtile tileid="1344" wangid="0,1,0,6,0,6,0,6"/>
   <wangtile tileid="1345" wangid="0,6,0,6,0,6,0,1"/>
   <wangtile tileid="1348" wangid="0,3,0,6,0,6,0,6"/>
   <wangtile tileid="1349" wangid="0,6,0,6,0,6,0,3"/>
   <wangtile tileid="1356" wangid="0,6,0,8,0,6,0,6"/>
   <wangtile tileid="1357" wangid="0,6,0,6,0,8,0,6"/>
   <wangtile tileid="1408" wangid="0,1,0,6,0,1,0,1"/>
   <wangtile tileid="1409" wangid="0,1,0,6,0,6,0,1"/>
   <wangtile tileid="1410" wangid="0,1,0,1,0,6,0,1"/>
   <wangtile tileid="1414" wangid="0,3,0,6,0,3,0,3"/>
   <wangtile tileid="1415" wangid="0,3,0,6,0,6,0,3"/>
   <wangtile tileid="1416" wangid="0,3,0,3,0,6,0,3"/>
   <wangtile tileid="1420" wangid="0,8,0,6,0,6,0,6"/>
   <wangtile tileid="1421" wangid="0,6,0,6,0,6,0,8"/>
   <wangtile tileid="1425" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1472" wangid="0,6,0,6,0,1,0,1"/>
   <wangtile tileid="1474" wangid="0,1,0,1,0,6,0,6"/>
   <wangtile tileid="1478" wangid="0,6,0,6,0,3,0,3"/>
   <wangtile tileid="1480" wangid="0,3,0,3,0,6,0,6"/>
   <wangtile tileid="1486" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1487" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1536" wangid="0,6,0,1,0,1,0,1"/>
   <wangtile tileid="1537" wangid="0,6,0,1,0,1,0,6"/>
   <wangtile tileid="1538" wangid="0,1,0,1,0,1,0,6"/>
   <wangtile tileid="1542" wangid="0,6,0,3,0,3,0,3"/>
   <wangtile tileid="1543" wangid="0,6,0,3,0,3,0,6"/>
   <wangtile tileid="1544" wangid="0,3,0,3,0,3,0,6"/>
   <wangtile tileid="1550" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1551" wangid="0,2,0,8,0,2,0,2"/>
   <wangtile tileid="1552" wangid="0,2,0,8,0,8,0,2"/>
   <wangtile tileid="1553" wangid="0,2,0,2,0,8,0,2"/>
   <wangtile tileid="1554" wangid="0,8,0,2,0,8,0,8"/>
   <wangtile tileid="1600" wangid="0,6,0,1,0,6,0,6"/>
   <wangtile tileid="1601" wangid="0,6,0,6,0,1,0,6"/>
   <wangtile tileid="1604" wangid="0,6,0,3,0,6,0,6"/>
   <wangtile tileid="1605" wangid="0,6,0,6,0,3,0,6"/>
   <wangtile tileid="1614" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1615" wangid="0,8,0,8,0,2,0,2"/>
   <wangtile tileid="1616" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1617" wangid="0,2,0,2,0,8,0,8"/>
   <wangtile tileid="1618" wangid="0,2,0,8,0,8,0,8"/>
   <wangtile tileid="1664" wangid="0,1,0,6,0,6,0,6"/>
   <wangtile tileid="1665" wangid="0,6,0,6,0,6,0,1"/>
   <wangtile tileid="1668" wangid="0,3,0,6,0,6,0,6"/>
   <wangtile tileid="1669" wangid="0,6,0,6,0,6,0,3"/>
   <wangtile tileid="1678" wangid="0,8,0,8,0,8,0,8"/>
   <wangtile tileid="1679" wangid="0,8,0,2,0,2,0,2"/>
   <wangtile tileid="1680" wangid="0,8,0,2,0,2,0,8"/>
   <wangtile tileid="1681" wangid="0,2,0,2,0,2,0,8"/>
   <wangtile tileid="1728" wangid="0,2,0,6,0,2,0,2"/>
   <wangtile tileid="1729" wangid="0,2,0,6,0,6,0,2"/>
   <wangtile tileid="1730" wangid="0,2,0,2,0,6,0,2"/>
   <wangtile tileid="1731" wangid="0,6,0,2,0,6,0,6"/>
   <wangtile tileid="1732" wangid="0,6,0,6,0,2,0,6"/>
   <wangtile tileid="1792" wangid="0,6,0,6,0,2,0,2"/>
   <wangtile tileid="1793" wangid="0,6,0,6,0,6,0,6"/>
   <wangtile tileid="1794" wangid="0,2,0,2,0,6,0,6"/>
   <wangtile tileid="1795" wangid="0,2,0,6,0,6,0,6"/>
   <wangtile tileid="1796" wangid="0,6,0,6,0,6,0,2"/>
   <wangtile tileid="1856" wangid="0,6,0,2,0,2,0,2"/>
   <wangtile tileid="1857" wangid="0,6,0,2,0,2,0,6"/>
   <wangtile tileid="1858" wangid="0,2,0,2,0,2,0,6"/>
   <wangtile tileid="1920" wangid="0,6,0,7,0,6,0,6"/>
   <wangtile tileid="1921" wangid="0,6,0,7,0,7,0,6"/>
   <wangtile tileid="1922" wangid="0,6,0,6,0,7,0,6"/>
   <wangtile tileid="1923" wangid="0,7,0,6,0,7,0,7"/>
   <wangtile tileid="1924" wangid="0,7,0,7,0,6,0,7"/>
   <wangtile tileid="1984" wangid="0,7,0,7,0,6,0,6"/>
   <wangtile tileid="1985" wangid="0,7,0,7,0,7,0,7"/>
   <wangtile tileid="1986" wangid="0,6,0,6,0,7,0,7"/>
   <wangtile tileid="1987" wangid="0,6,0,7,0,7,0,7"/>
   <wangtile tileid="1988" wangid="0,7,0,7,0,7,0,6"/>
   <wangtile tileid="2048" wangid="0,7,0,6,0,6,0,6"/>
   <wangtile tileid="2049" wangid="0,7,0,6,0,6,0,7"/>
   <wangtile tileid="2050" wangid="0,6,0,6,0,6,0,7"/>
   <wangtile tileid="2112" wangid="0,1,0,8,0,1,0,1"/>
   <wangtile tileid="2113" wangid="0,1,0,8,0,8,0,1"/>
   <wangtile tileid="2114" wangid="0,1,0,1,0,8,0,1"/>
   <wangtile tileid="2115" wangid="0,3,0,8,0,3,0,3"/>
   <wangtile tileid="2116" wangid="0,3,0,8,0,8,0,3"/>
   <wangtile tileid="2117" wangid="0,3,0,3,0,8,0,3"/>
   <wangtile tileid="2118" wangid="0,1,0,8,0,1,0,1"/>
   <wangtile tileid="2119" wangid="0,1,0,8,0,8,0,1"/>
   <wangtile tileid="2120" wangid="0,1,0,1,0,8,0,1"/>
   <wangtile tileid="2121" wangid="0,3,0,0,0,3,0,3"/>
   <wangtile tileid="2122" wangid="0,3,0,0,0,0,0,3"/>
   <wangtile tileid="2123" wangid="0,3,0,3,0,0,0,3"/>
   <wangtile tileid="2176" wangid="0,8,0,8,0,1,0,1"/>
   <wangtile tileid="2178" wangid="0,1,0,1,0,8,0,8"/>
   <wangtile tileid="2179" wangid="0,8,0,8,0,3,0,3"/>
   <wangtile tileid="2181" wangid="0,3,0,3,0,8,0,8"/>
   <wangtile tileid="2182" wangid="0,8,0,8,0,1,0,1"/>
   <wangtile tileid="2184" wangid="0,1,0,1,0,8,0,8"/>
   <wangtile tileid="2185" wangid="0,0,0,0,0,3,0,3"/>
   <wangtile tileid="2187" wangid="0,3,0,3,0,0,0,0"/>
   <wangtile tileid="2240" wangid="0,8,0,1,0,1,0,1"/>
   <wangtile tileid="2241" wangid="0,8,0,1,0,1,0,8"/>
   <wangtile tileid="2242" wangid="0,1,0,1,0,1,0,8"/>
   <wangtile tileid="2243" wangid="0,8,0,3,0,3,0,3"/>
   <wangtile tileid="2244" wangid="0,8,0,3,0,3,0,8"/>
   <wangtile tileid="2245" wangid="0,3,0,3,0,3,0,8"/>
   <wangtile tileid="2246" wangid="0,8,0,1,0,1,0,1"/>
   <wangtile tileid="2247" wangid="0,8,0,1,0,1,0,8"/>
   <wangtile tileid="2248" wangid="0,1,0,1,0,1,0,8"/>
   <wangtile tileid="2249" wangid="0,0,0,3,0,3,0,3"/>
   <wangtile tileid="2250" wangid="0,0,0,3,0,3,0,0"/>
   <wangtile tileid="2251" wangid="0,3,0,3,0,3,0,0"/>
   <wangtile tileid="2304" wangid="0,8,0,1,0,8,0,8"/>
   <wangtile tileid="2305" wangid="0,8,0,8,0,1,0,8"/>
   <wangtile tileid="2306" wangid="0,8,0,3,0,8,0,8"/>
   <wangtile tileid="2307" wangid="0,8,0,8,0,3,0,8"/>
   <wangtile tileid="2308" wangid="0,8,0,1,0,8,0,8"/>
   <wangtile tileid="2309" wangid="0,8,0,8,0,1,0,8"/>
   <wangtile tileid="2310" wangid="0,8,0,3,0,8,0,8"/>
   <wangtile tileid="2311" wangid="0,8,0,8,0,3,0,8"/>
   <wangtile tileid="2368" wangid="0,1,0,8,0,8,0,8"/>
   <wangtile tileid="2369" wangid="0,8,0,8,0,8,0,1"/>
   <wangtile tileid="2370" wangid="0,3,0,8,0,8,0,8"/>
   <wangtile tileid="2371" wangid="0,8,0,8,0,8,0,3"/>
   <wangtile tileid="2372" wangid="0,1,0,8,0,8,0,8"/>
   <wangtile tileid="2373" wangid="0,8,0,8,0,8,0,1"/>
   <wangtile tileid="2374" wangid="0,3,0,8,0,8,0,8"/>
   <wangtile tileid="2375" wangid="0,8,0,8,0,8,0,3"/>
   <wangtile tileid="2432" wangid="0,8,0,7,0,8,0,8"/>
   <wangtile tileid="2433" wangid="0,8,0,7,0,7,0,8"/>
   <wangtile tileid="2434" wangid="0,8,0,8,0,7,0,8"/>
   <wangtile tileid="2435" wangid="0,7,0,8,0,7,0,7"/>
   <wangtile tileid="2436" wangid="0,7,0,7,0,8,0,7"/>
   <wangtile tileid="2496" wangid="0,7,0,7,0,8,0,8"/>
   <wangtile tileid="2497" wangid="0,7,0,7,0,7,0,7"/>
   <wangtile tileid="2498" wangid="0,8,0,8,0,7,0,7"/>
   <wangtile tileid="2499" wangid="0,8,0,7,0,7,0,7"/>
   <wangtile tileid="2500" wangid="0,7,0,7,0,7,0,8"/>
   <wangtile tileid="2560" wangid="0,7,0,8,0,8,0,8"/>
   <wangtile tileid="2561" wangid="0,7,0,8,0,8,0,7"/>
   <wangtile tileid="2562" wangid="0,8,0,8,0,8,0,7"/>
  </wangset>
  <wangset name="Walls" type="corner" tile="3985">
   <wangcolor name="Smithy Walls" color="#606976" tile="3985" probability="1"/>
   <wangcolor name="Stone Platform" color="#5c5066" tile="1763" probability="1"/>
   <wangtile tileid="1573" wangid="0,2,0,0,0,2,0,2"/>
   <wangtile tileid="1574" wangid="0,2,0,2,0,0,0,2"/>
   <wangtile tileid="1634" wangid="0,0,0,2,0,0,0,0"/>
   <wangtile tileid="1635" wangid="0,0,0,2,0,2,0,0"/>
   <wangtile tileid="1636" wangid="0,0,0,0,0,2,0,0"/>
   <wangtile tileid="1637" wangid="0,0,0,2,0,2,0,2"/>
   <wangtile tileid="1638" wangid="0,2,0,2,0,2,0,0"/>
   <wangtile tileid="1698" wangid="0,2,0,2,0,0,0,0"/>
   <wangtile tileid="1699" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="1700" wangid="0,0,0,0,0,2,0,2"/>
   <wangtile tileid="1701" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="1702" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="1762" wangid="0,2,0,0,0,0,0,0"/>
   <wangtile tileid="1763" wangid="0,2,0,0,0,0,0,2"/>
   <wangtile tileid="1764" wangid="0,0,0,0,0,0,0,2"/>
   <wangtile tileid="1765" wangid="0,2,0,2,0,2,0,2"/>
   <wangtile tileid="3984" wangid="0,0,0,1,0,0,0,0"/>
   <wangtile tileid="3985" wangid="0,0,0,1,0,1,0,0"/>
   <wangtile tileid="3986" wangid="0,0,0,1,0,1,0,0"/>
   <wangtile tileid="3987" wangid="0,0,0,0,0,1,0,0"/>
   <wangtile tileid="4048" wangid="0,1,0,0,0,0,0,0"/>
   <wangtile tileid="4049" wangid="0,1,0,0,0,0,0,1"/>
   <wangtile tileid="4050" wangid="0,1,0,0,0,0,0,1"/>
   <wangtile tileid="4051" wangid="0,0,0,0,0,0,0,1"/>
  </wangset>
  <wangset name="Fences" type="edge" tile="1376">
   <wangcolor name="Wood Fence" color="#ff0000" tile="1376" probability="1"/>
   <wangcolor name="Metal Fence" color="#00ff00" tile="801" probability="1"/>
   <wangcolor name="Fancy Fence" color="#0000ff" tile="993" probability="1"/>
   <wangcolor name="Fancy Fence Base" color="#ff7700" tile="1057" probability="1"/>
   <wangtile tileid="735" wangid="0,0,0,0,2,0,0,0"/>
   <wangtile tileid="736" wangid="0,0,2,0,0,0,0,0"/>
   <wangtile tileid="737" wangid="0,0,2,0,0,0,2,0"/>
   <wangtile tileid="738" wangid="0,0,0,0,0,0,2,0"/>
   <wangtile tileid="799" wangid="2,0,0,0,2,0,0,0"/>
   <wangtile tileid="800" wangid="0,0,2,0,2,0,0,0"/>
   <wangtile tileid="801" wangid="0,0,2,0,2,0,2,0"/>
   <wangtile tileid="802" wangid="0,0,0,0,2,0,2,0"/>
   <wangtile tileid="863" wangid="2,0,0,0,0,0,0,0"/>
   <wangtile tileid="864" wangid="2,0,2,0,2,0,0,0"/>
   <wangtile tileid="865" wangid="2,0,2,0,2,0,2,0"/>
   <wangtile tileid="866" wangid="2,0,0,0,2,0,2,0"/>
   <wangtile tileid="928" wangid="2,0,2,0,0,0,0,0"/>
   <wangtile tileid="929" wangid="2,0,2,0,0,0,2,0"/>
   <wangtile tileid="930" wangid="2,0,0,0,0,0,2,0"/>
   <wangtile tileid="931" wangid="0,0,3,0,0,0,0,0"/>
   <wangtile tileid="992" wangid="0,0,3,0,3,0,0,0"/>
   <wangtile tileid="993" wangid="0,0,3,0,3,0,3,0"/>
   <wangtile tileid="994" wangid="0,0,0,0,3,0,3,0"/>
   <wangtile tileid="995" wangid="0,0,4,0,0,0,0,0"/>
   <wangtile tileid="1056" wangid="3,0,4,0,4,0,0,0"/>
   <wangtile tileid="1057" wangid="3,0,4,0,4,0,4,0"/>
   <wangtile tileid="1058" wangid="3,0,0,0,4,0,4,0"/>
   <wangtile tileid="1059" wangid="0,0,3,0,0,0,3,0"/>
   <wangtile tileid="1119" wangid="0,0,0,0,3,0,0,0"/>
   <wangtile tileid="1120" wangid="3,0,3,0,3,0,0,0"/>
   <wangtile tileid="1121" wangid="3,0,3,0,3,0,3,0"/>
   <wangtile tileid="1122" wangid="3,0,0,0,3,0,3,0"/>
   <wangtile tileid="1123" wangid="0,0,4,0,0,0,4,0"/>
   <wangtile tileid="1183" wangid="3,0,0,0,3,0,0,0"/>
   <wangtile tileid="1184" wangid="4,0,4,0,4,0,0,0"/>
   <wangtile tileid="1185" wangid="4,0,4,0,4,0,4,0"/>
   <wangtile tileid="1186" wangid="4,0,0,0,4,0,4,0"/>
   <wangtile tileid="1187" wangid="0,0,0,0,0,0,3,0"/>
   <wangtile tileid="1247" wangid="3,0,0,0,4,0,0,0"/>
   <wangtile tileid="1248" wangid="3,0,3,0,4,0,0,0"/>
   <wangtile tileid="1249" wangid="3,0,3,0,4,0,3,0"/>
   <wangtile tileid="1250" wangid="3,0,0,0,4,0,3,0"/>
   <wangtile tileid="1251" wangid="0,0,0,0,0,0,4,0"/>
   <wangtile tileid="1311" wangid="4,0,0,0,0,0,0,0"/>
   <wangtile tileid="1312" wangid="4,0,4,0,0,0,0,0"/>
   <wangtile tileid="1313" wangid="4,0,4,0,0,0,4,0"/>
   <wangtile tileid="1314" wangid="4,0,0,0,0,0,4,0"/>
   <wangtile tileid="1375" wangid="0,0,1,0,1,0,0,0"/>
   <wangtile tileid="1376" wangid="0,0,1,0,0,0,1,0"/>
   <wangtile tileid="1377" wangid="0,0,0,0,1,0,1,0"/>
   <wangtile tileid="1439" wangid="1,0,1,0,1,0,0,0"/>
   <wangtile tileid="1440" wangid="1,0,1,0,1,0,1,0"/>
   <wangtile tileid="1441" wangid="1,0,0,0,1,0,1,0"/>
   <wangtile tileid="1503" wangid="1,0,1,0,0,0,0,0"/>
   <wangtile tileid="1504" wangid="1,0,1,0,0,0,1,0"/>
   <wangtile tileid="1505" wangid="1,0,0,0,0,0,1,0"/>
   <wangtile tileid="1567" wangid="0,0,1,0,0,0,0,0"/>
   <wangtile tileid="1568" wangid="0,0,1,0,0,0,1,0"/>
   <wangtile tileid="1569" wangid="0,0,0,0,0,0,1,0"/>
   <wangtile tileid="1631" wangid="0,0,0,0,1,0,0,0"/>
   <wangtile tileid="1632" wangid="0,0,1,0,0,0,1,0"/>
   <wangtile tileid="1633" wangid="1,0,0,0,1,0,0,0"/>
   <wangtile tileid="1695" wangid="1,0,0,0,1,0,0,0"/>
   <wangtile tileid="1697" wangid="1,0,0,0,0,0,0,0"/>
  </wangset>
 </wangsets>
</tileset>
