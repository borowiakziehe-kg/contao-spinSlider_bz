/*
---

name: PictureSlider

description: Animated picture slider. This is a port of jQuery Orbit Slider

license: MIT-style

authors:
- Jakob Holmelund

requires:
- core/1.4.3: [Class, Element.Style, Fx.Tween]

provides: Spin, Element.spin

...
*/

var Spin = new Class({
	Implements: [Events, Options],
	options:{
		transition: "horizontal-push",//fade, horizontal-slide, vertical-slide, horizontal-push
		transitionOption: {transition:"linear",duration:600},
		timer: true,// true or false to have the timer
		advanceSpeed: 4000,// if timer is enabled, time between transitions
		pauseOnHover: false,// if you hover pauses the slider
		startClockOnMouseOut: true,// if clock should start on MouseOut
		startClockOnMouseOutAfter: 1000,// how long after MouseOut should the timer start again
		directionalNav: true,// manual advancing directional navs
		captions: true,// do you want captions?
		captionTransition: "fade",//fade, none
		captionTransitionOption: {transition:"linear",duration:600},// fade, slideOpen, none
		useNav: false,// fade, slideOpen, none
		bullets: true,// true or false to activate the bullet navigation
		bulletThumbs: false,// thumbnails for the bullets
		bulletThumbLocation: '',// location from this file where thumbs will be
		afterSlideChange: function(){}// empty function
	},
	initialize:function(element, options){
		this.setOptions(options);
		this.slides = element.getChildren("img, div, a");
		this.spin = element.addClass("spin");
		this.spinWrap = new Element("div").addClass("spin-wrapper").wraps(this.spin);
		this.activeSlide = this.slides[0];
		
		this.spinWrap.setStyles({
			width:'100%',
			height:this.spin.getSize().y
		});

        if(this.options.useNav) {
            this.setNavItemActive(0);
        }

		this.activeSlide.setStyles({
			"opacity": 0.0,
			display:"block"
		});
		var self = this;
		this.activeSlide.setStyles({"z-index" : 3}).get("tween").start("opacity", 1.0).chain(function() {
			self.slides.each(function(slide){
				slide.setStyles({"display":"block"});
			});
		});

		if(this.options.timer) {
			this.timer = new Element("div").addClass("timer").inject(this.spinWrap);
			this.timer.mask = new Element("span").addClass("mask").inject(this.timer);
			this.timer.rotator = new Element("span").addClass("rotator").inject(this.timer.mask);
			this.timer.pause = new Element("span").addClass("pause").inject(this.timer);
			this.degrees = 0;

			this._startClock();

			this.timer.addEvent("click", function(e){
				if(!self.timerRunning){
					self._startClock();
				}else{
					self._stopClock();
				}
			});
			if(this.options.startClockOnMouseOut){
				var outTimer;
				this.spinWrap.addEvents({
					mouseleave:function(){
						outTimer = (function(){
							if(!self.timerRunning){
								self._startClock();
							}
						}).delay(self.options.startClockOnMouseOutAfter);
					},
					mouseenter:function(){
						clearTimeout(outTimer);
					}
				});
			}
		}

		if(this.options.captions) {
				this.caption = new Element("div",{style:"display:block;"}).addClass("spin-caption").inject(this.spinWrap);
				//this.caption.fade("hide");
				this._setCaption();
		}
		if(this.options.directionalNav) {
				if(this.options.directionalNav == "false") { return false; }
				var sliderNav = new Element("div").addClass("slider-nav").inject(this.spinWrap);
				this.leftBtn = new Element("span").addClass("left").inject(sliderNav);
				this.rightBtn = new Element("span").addClass("right").inject(sliderNav);
				
				this.leftBtn.addEvent("click", function(e){
					self._stopClock();
					self._spin("prev");
				});
				this.rightBtn.addEvent("click", function(e){
					self._stopClock();
					self._spin("next");
				});
		}

			//Pause Timer on hover
		if(this.options.pauseOnHover) {
			this.spinWrap.addEvent("mouseenter", function(){
				self._stopClock();
			});
		}

		if(this.options.bullets){
			this.bullets = new Element("ul").addClass("spin-bullets").inject(this.spinWrap);
			this.slides.each(function(slide, index){
				new Element("li.slide-bullet-"+index,{text:index+1}).addEvent("click", function(){
					self._stopClock();
					self._spin(index);
				}).inject(self.bullets);
			});
			this._setActiveBullet();
		}

        if(this.options.useNav) {
            var nav = document.getElement(this.options.useNav);
            var self = this;
            nav.getChildren('li').each(function(el, i){
                el.addEvent('click', function(e) {
                    e.preventDefault();
                    self.showItem(i);

                });
            }, this);
        }

        this.slides.each(function(el) {
            el.addEvent('swipe', function(event){
                if(event.direction === 'left') {
                    self.rightBtn.fireEvent('click');
                } else if(event.direction === 'right') {
                    self.leftBtn.fireEvent('click');
                } // either 'left' or 'right'

                event.start // {x: Number, y: Number} where the swipe started
                event.end // {x: Number, y: Number} where the swipe ended
            });


/*
            el.addEvents({
                'touchstart': function(e) {
                    self._stopClock();
                    console.log('geht los');
                },
                'touchmove': function() {

                }
            });*/
        });

	},
	_spin:function(direction){
		var prevActiveSlideIndex = this.slides.indexOf(this.activeSlide),
			activeSlideIndex = prevActiveSlideIndex,
			slideDirection = direction,
			slideLength = this.slides.length;

		if(prevActiveSlideIndex === slideDirection) { return false; }

		var self = this;

		if(this.slides.length === 1) { return false; }



		if(!this.locked){
			this.lock();
            if(direction == "next") {
				activeSlideIndex++;
				if(activeSlideIndex == slideLength) {
					activeSlideIndex = 0;
				}
			} else if(direction == "prev") {
				activeSlideIndex--;
				if(activeSlideIndex < 0) {
					activeSlideIndex = slideLength-1;
				}
			} else {
				activeSlideIndex = direction;
				if (prevActiveSlideIndex < activeSlideIndex) {
					slideDirection = "next";
				} else if (prevActiveSlideIndex > activeSlideIndex) {
					slideDirection = "prev";
				}
			}
			var activePrevSlide =this.slides[prevActiveSlideIndex];
			var activeSlide = this.slides[activeSlideIndex];
            if(this.options.useNav) {
                this.setNavItemActive(activeSlideIndex);
            }


            this.activeSlide = activeSlide;
			this._setActiveBullet();
			activePrevSlide.setStyle("z-index", 2);
			orbitWidth = this.spin.getSize().x;
			orbitHeight = this.spin.getSize().y;




			if(this.options.transition === "fade"){
				activeSlide.set("morph", this.options.transitionOption);
				activeSlide.setStyles({
					opacity:0.0,
					"z-index" : 3
				});
				activeSlide.get("morph").start({"opacity": 1.0}).chain(function(){
					self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
					self.unlock();
					self.options.afterSlideChange(this);
				});
			}else if(this.options.transition === "horizontal-slide"){
				activeSlide.set("morph", this.options.transitionOption);
				if(slideDirection == "next") {
					activeSlide.setStyles({
						"left": orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"left": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
				if(slideDirection == "prev") {
					activeSlide.setStyles({
						"left": -orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"left": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
			}else if(this.options.transition === "vertical-slide"){
				activeSlide.set("morph", this.options.transitionOption);
				if(slideDirection == "prev") {
					activeSlide.setStyles({
						"top": orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"top": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
				if(slideDirection == "next") {
					activeSlide.setStyles({
						"top": -orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"top": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
			}else if(this.options.transition === "horizontal-push"){
				activeSlide.set("morph", this.options.transitionOption);
				activePrevSlide.set("morph", this.options.transitionOption);
				if(slideDirection == "next") {
					activeSlide.setStyles({
						"left": orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"left": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});

					activePrevSlide.get("morph").start({"left": -orbitWidth}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
				if(slideDirection == "prev") {
					activeSlide.setStyles({
						"left": -orbitWidth,
						"z-index" : 3
					});
					activeSlide.get("morph").start({"left": 0}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});

					activePrevSlide.get("morph").start({"left": orbitWidth}).chain(function(){
						self.slides[prevActiveSlideIndex].setStyle("z-index", 1);
						self.unlock();
						self.options.afterSlideChange(this);
					});
				}
			}
			this._setCaption();
		}

	},

    showItem: function(element) {
        this._stopClock();
        this._spin(element);

    },

	_setActiveBullet:function(){
		if(!this.options.bullets) { return false; } else {
			var activeSlideIndex = this.slides.indexOf(this.activeSlide);
			this.bullets.getChildren().each(function(bullet, index){
				if(index === activeSlideIndex){
					bullet.addClass("active");
				}else{
					bullet.removeClass('active');
				}
			});
		}
	},
	_startClock:function(){
		var self = this;
		if(!this.timer.isVisible()){
			this.clock = (function(e){
						self._spin("next");
			}).periodical(this.options.advanceSpeed);
		}else{
			this.timerRunning = true;
			this.timer.pause.removeClass("active");
			this.clock = (function(e){
				var degreeCSS = "rotate("+self.degrees+"deg)";
				self.degrees += 2;
				self.timer.rotator.setStyles({
					"-webkit-transform": degreeCSS,
					"-moz-transform": degreeCSS,
					"-o-transform": degreeCSS,
					"transform": degreeCSS
				});
				if(self.degrees > 180) {
					self.timer.rotator.addClass('move');
					self.timer.mask.addClass('move');
				}
				if(self.degrees > 360) {
					self.timer.rotator.removeClass('move');
					self.timer.mask.removeClass('move');
					self.degrees = 0;
					self._spin("next");
				}
			}).periodical(this.options.advanceSpeed/180);
		}
	},
	_stopClock:function(){
		if(!this.options.timer || this.options.timer == 'false') { return false; } else {
			this.timerRunning = false;
			clearInterval(this.clock);
			this.timer.pause.addClass('active');
		}
	},
	_setCaption:function(){
		var caption = this.activeSlide.get("rel");
		this.caption.setStyles({
				opacity:0.0,
				visibility:"visible",
				display:"block"
			});
		if(this.options.captions && caption !== undefined && caption !== "" && caption !== null){
			this.caption.set("text", caption);
			if(this.options.captionTransition === "fade"){
				this.caption.set("morph", this.options.captionTransitionOption);
				this.caption.morph({opacity:1.0});
			}else if(this.options.captionTransition === "none"){
				this.caption.fade("show");
			}
		}
	},
	unlock:function(){
		this.locked = false;
	},
	lock:function(){
		this.locked = true;
	},

    setNavItemActive: function(countId) {
        var nav = document.getElement(this.options.useNav);
        nav.getChildren('li').removeClass('active');
        nav.getChildren('li')[countId].addClass('active');
    }
});

Element.implement({
  spin : function(options) {
	new Spin(this, options);
	return this;
  }
});