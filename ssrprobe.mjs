import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { motion } from "framer-motion";

// 1) initial={{opacity:0}} (o que o SERVIDOR renderiza, semMovimento === null)
console.log("servidor :", renderToStaticMarkup(
  h(motion.p, { initial: { opacity: 0 }, animate: { opacity: 0 } }, "x")
));

// 2) initial={false} + animate 1 (o que o CLIENTE renderiza com reduce-motion ON)
console.log("cliente  :", renderToStaticMarkup(
  h(motion.p, { initial: false, animate: { opacity: 1 } }, "x")
));

// 3) titulo: initial={{y:'108%',opacity:0}} vs initial={false}+animate{y:0,opacity:1}
console.log("titulo srv:", renderToStaticMarkup(
  h(motion.span, { initial: { y: "108%", opacity: 0 }, animate: { y: "108%", opacity: 0 } }, "x")
));
console.log("titulo cli:", renderToStaticMarkup(
  h(motion.span, { initial: false, animate: { y: 0, opacity: 1 } }, "x")
));

// 4) noscript com <style> filho — o servidor emite o CSS?
console.log("noscript :", renderToStaticMarkup(
  h("noscript", null, h("style", null, ".a{opacity:1!important}"))
));
