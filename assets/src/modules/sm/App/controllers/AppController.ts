angular.module('sm').controller('AppController', function ($scope, localStorage, $window, $filter, $state, $stateParams) {
  // Force save on close
  window.onbeforeunload = function () {
    $scope.saveState()
  }

  $scope.initState = function () {
    $scope.state = {}
    $scope.state.courses = []
    $scope.state.courseMap = {}
    $scope.state.nonCourses = []
    $scope.state.noCourses = []
    $scope.state.schedules = []
    $scope.state.drawOptions = {
      startTime: 480,
      endTime: 1320,
      startDay: 1,
      endDay: 6,
      bldgStyle: 'code',
      theme: 'woc',
      classDetails: 'NPL'
    }

    $scope.state.displayOptions = {
      currentPage: 0,
      pageSize: 3,
      creditWarning: 18,
      fullscreen: ''
    }

    $scope.state.requestOptions = {
      term: +$scope.defaultTerm,
      ignoreFull: false
    }

    $scope.state.ui = {
      alert_newFeatures: true,
      alert_generateFeatures: true,
      alert_searchFeatures: true,
      alert_browseFeatures: true,
      alert_labClasses: false,
      action_generateSchedules: false
    }

    $scope.state.meta = {
      stateVersion: $scope.stateVersion,
      lastSaved: new Date().getTime()
    }
  }
  $scope.resetState = function () {
    $scope.initState()
    $state.transitionTo($state.current, $stateParams, {
      reload: true,
      inherit: false,
      notify: true
    })
  }

  $scope.saveState = function () {
    localStorage.setItem('state', $scope.state)
  }

  $scope.noStateSaveOnUnload = function () {
    $window.onbeforeunload = function () {
      // No-op
    }
  }

  // Reload the state if it exists
  const storedState = localStorage.getItem('state')
  if (storedState != null) {
    // Check if state version exists or is correct
    if (storedState.hasOwnProperty('meta') && storedState.meta.stateVersion === $scope.stateVersion) {
      $scope.state = storedState
      if (!$scope.state.displayOptions.hasOwnProperty('creditWarning') || !$scope.state.displayOptions.creditWarning) {
        $scope.state.displayOptions.creditWarning = 18
      }

      // Initialize new values
      if ($scope.state.schedules.length > 0 && $scope.state.schedules[0].length > 0 && !$scope.state.schedules[0][0].hasOwnProperty('initialIndex')) {
        for (let count = 0; count < $scope.state.schedules.length; count++) {
          $scope.state.schedules[count][0].initialIndex = count
        }
      }
      if (!$scope.state.drawOptions.classDetails) {
        $scope.state.drawOptions.classDetails = 'NPL'
      }
      if (!$scope.state.drawOptions.theme) {
        $scope.state.drawOptions.theme = 'woc'
      }
    } else {
      // Before state meta
      if (confirm('We need to clear your session in order to update ScheduleMaker, is that ok? \n If you press cancel, you may run into errors.')) {
        $scope.resetState()
      } else {
        $scope.state = storedState
      }
    }
  } else {
    // New session, create new state
    $scope.initState()
    $scope.saveState()
  }

  // Default, images are supported
  $scope.imageSupport = true

  const courseNumFilter = $filter('courseNum')

  // Course cart tools for non-generate pages.
  $scope.courseCart = {
    nextId: 0,
    init: function () {
      // Reset id if loaded from state
      if ($scope.state.courses.length > 0) {
        $scope.courseCart.nextId = $scope.state.courses[$scope.state.courses.length - 1].id + 1
      }
    },
    count: {
      all: {

        /**
         * Returns the total number of selected sections in the cart
         */
        selectedSections: function () {
          let count = 0
          for (let i = 0; i < $scope.state.courses.length; i++) {
            if ($scope.state.courses[i]) {
              count += $scope.courseCart.count.course.selectedSections($scope.state.courses[i])
            }
          }
          return count
        },

        /**
         * Returns the total number of courses from the selectCoursesController
         */
        coursesFromSelect: function () {
          let count = 0
          for (let i = 0; i < $scope.state.courses.length; i++) {
            if ($scope.state.courses[i].fromSelect) {
              count++
            }
          }
          return count
        }
      },
      course: {
        selectedSections: function (course: Course) {
          let count = 0
          for (let i = 0; i < course.sections.length; i++) {
            if (course.sections[i].selected) count++
          }
          return count
        }
      }
    },
    selection: {
      all: {

        /**
         * Unselects everything in the cart
         */
        unselect: function () {
          for (let i = 0; i < $scope.state.courses.length; i++) {
            for (let s = 0;
              s < $scope.state.courses[i].sections.length; s++) {
              $scope.state.courses[i].sections[s].selected =
                false
            }
          }
        }
      },
      section: {

        /**
         * Toggle the selection status of a section, but check if its
         * course is in the cart already, if not, add it.
         *
         * @param course {Object} The course the section belongs to
         * @param section {Object} The section to toggle
         */
        toggleByCourse: function (course: Course, section: Section) {
          course = $scope.courseCart.ensure.course(course)

          if (course.selected && section.selected) {
            course.selected = false
          }
          section.selected = !section.selected
        },

        /**
         * Toggle the selection status of a section, but check if its
         * an orphaned section or not before doing so
         *
         * @param section {Object} The section to toggle
         */
        toggleByOrphanedSection: function (section: Section) {
          section = $scope.courseCart.ensure.section(section)

          section.selected = !section.selected
        },

        /**
         * Toggle the selected status of a selection
         *
         * Pre-condition: The section is already in the cart
         *
         * @param section {Object} The section to toggle
         */
        toggle: function (section: Section) {
          section.selected = !section.selected
        },

        /**
         * Checks if section is selected, but first checks if course is
         * in the cart -- if not, add it.
         *
         * @param course {Object} The course the section belongs to
         * @param section {Object} The section to toggle
         */
        isByCourse: function (course: Course, section: Section) {
          return $scope.courseCart.contains.course(course) &&
            section.selected
        }
      },
      course: {
        /**
         * Toggles the current course's sections selcted state
         */
        toggle: function (course: Course) {
          // If new this load or not
          const Ecourse = $scope.courseCart.ensure.course(course)

          course.selected = !$scope.courseCart.selection.course
            .toggleAllSections(Ecourse)
        },

        is: function (course: Course) {
          if ($scope.courseCart.contains.course(course)) {
            return $scope.courseCart.selection.course
              .allSections($scope.courseCart.ensure.course(course))
          } else {
            return false
          }
        },

        /**
         * Toggles all sections in the course
         *
         * Pre-condition: the course exists in the cart
         */
        toggleAllSections: function (course: Course) {
          const setTo = !$scope.courseCart.selection.course
            .allSections(course)
          course.sections.forEach(function (section) {
            section.selected = setTo
          })

          return setTo
        },

        /**
         * Returns true if all sections are selected
         */
        allSections: function (course: Course) {
          return course.sections.reduce(
            function (total, section) {
              return total && section.selected
            }, true)
        },

        /**
         * Unselects all sections
         */
        unselect: function (course :Course) {
          course.sections.forEach(function (section) {
            section.selected = false
          })
        }
      }
    },

    ensure: {
      /**
       * Ensure the provided course is in the cart
       *
       *  @param course {Object} The course to ensure
       */
      course: function (course: Course) {
        let ensuredCourse: Course | boolean = false

        if ($scope.state.courses.indexOf(course) === -1) {
          // The course object was not found in the cart

          if ($scope.courseCart.contains.course(course)) {
            // The course object has been added previously

            // Find it by matching ids
            for (let i = 0; i < $scope.state.courses.length; i++) {
              if (course.id === $scope.state.courses[i].id) {
                ensuredCourse = $scope.state.courses[i]
                break
              }
            }

            // The course *must* have been found and broken out
            // of the loop
          } else {
            // The course has never been added and is not in the
            // cart, so create a new course object

            ensuredCourse = $scope.courseCart.create
              .fromExistingCourse(course)
          }
        } else {
          // The course object is already in the cart.
          ensuredCourse = course
        }

        // Return the ensuredCourse
        return ensuredCourse
      },

      section: function (section: Section) {
        if ($scope.courseCart.contains.section(section)) {
          let foundCourse = false
          for (let i = 0; i < $scope.state.courses.length; i++) {
            if (section.courseId === $scope.state.courses[i].id) {
              foundCourse = $scope.state.courses[i]
              break
            }
          }

          return $scope.courseCart.add
            .sectionToCourse(section, foundCourse)
        } else {
          return $scope.courseCart.create
            .fromExistingSection(section)
        }
      }
    },

    contains: {

      /**
       * Checks if the provided course is in the cart
       * @param course {Object} The course to check
       * @returns {Boolean} The course is in the cart?
       */
      course: function (course: Course) {
        return $scope.state.courseMap.hasOwnProperty(course.id)
      },

      /**
       * Checks if the provided section (with courseId) is in the cart
       * @param section {Object} The course to check
       * @returns {Boolean} The course is in the cart?
       */
      section: function (section: Section) {
        return $scope.state.courseMap.hasOwnProperty(section.courseId)
      }

    },
    remove: {

      /**
       * Remove a course completely by index
       * @param index The index to remove
       */
      byIndex: function (index: number) {
        $scope.state.courses.splice(index, 1)
      }
    },
    add: {

      /**
       * Adds a given section to the provided course if it's not there
       */
      sectionToCourse: function (section: Section, course: Course) {
        let foundSection = false
        for (let i = 0; i < course.sections.length; i++) {
          if (section.id === course.sections[i].id) {
            course.sections[i] = section
            foundSection = true
            break
          }
        }

        if (foundSection === false) {
          course.sections.push(section)
        }
        return section
      },

      /**
       * Add a pre-created course to the cart
       * @param course An already formatted course ready for adding
       * @returns {Object} The created course
       */
      courseToCart: function (course: Course) {
        $scope.state.courses.push(course)
        $scope.$broadcast('addedCourse')

        return course
      }
    },
    create: {

      /**
       * Creates and adds a new blank course and the adds it to the cart
       *
       * @returns {Object} The newly created course
       */
      blankCourse: function () {
        return $scope.courseCart.add.courseToCart(
          $scope.courseCart.getBlankCourse(true))
      },

      /**
       * Creates and adds a pre-existing course from the database to the
       * cart
       *
       * @param course {Object} A course from the database
       * @returns {Object} The newly created course
       */
      fromExistingCourse: function (course: Course) {
        const mockCourse = $scope.courseCart.getBlankCourse(false)

        course.fromSelect = false
        course.search = courseNumFilter(course)

        $scope.state.courseMap[course.id] = true
        return $scope.courseCart.add.courseToCart(course)
      },

      /**
       * Creates and adds a pre-existing course from a schedule
       *
       * @param scheduleCourse A course from the database
       * @returns The newly created course
       */
      fromExistingScheduleCourse: function (scheduleCourse: Course): Course {
        const course = $scope.courseCart.getBlankCourse(true)

        course.search = scheduleCourse.courseNum
        scheduleCourse.selected = true
        course.sections.push(scheduleCourse)

        $scope.courseCart.add.courseToCart(course)

        return course
      },

      /**
       * Creates and adds a pre-existing section from the database to the
       * cart
       *
       * @param existingSection A section from the database
       * @returns The section now added to the course
       */
      fromExistingSection: function (section: Section): Section {
        const course = $scope.courseCart.getBlankCourse(false)

        course.id = section.courseId
        course.search = section.courseParentNum

        course.sections.push(section)

        $scope.state.courseMap[course.id] = true
        $scope.courseCart.add.courseToCart(course)

        return section
      }
    },

    /**
     * Returns a POJO with a correct id and other features
     *
     * @param fromSelect
     * @returns {Object} A new course
     */
    getBlankCourse: function (fromSelect) {
      return {
        id: ++$scope.courseCart.nextId,
        search: '',
        sections: [],
        status: 'D',
        fromSelect: fromSelect
      }
    }

  }
  $scope.courseCart.init()

  $scope.generateSchedules = function () {
    $scope.state.ui.action_generateSchedules = true
    $state.go('generate')
  }

  $scope.ui = {
    optionLists: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      times: {
        keys: [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900, 960, 1020, 1080, 1140, 1200, 1260, 1320, 1380, 1440],
        values: {
          '': 'Choose',
          0: '12:00am',
          60: '1:00am',
          120: '2:00am',
          180: '3:00am',
          240: '4:00am',
          300: '5:00am',
          360: '6:00am',
          420: '7:00am',
          480: '8:00am',
          540: '9:00am',
          600: '10:00am',
          660: '11:00am',
          720: '12:00pm',
          780: '1:00pm',
          840: '2:00pm',
          900: '3:00pm',
          960: '4:00pm',
          1020: '5:00pm',
          1080: '6:00pm',
          1140: '7:00pm',
          1200: '8:00pm',
          1260: '9:00pm',
          1320: '10:00pm',
          1380: '11:00pm',
          1440: '12:00am'
        }
      },
      timesHalfHours: {
        keys: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360, 390, 420, 450, 480, 510, 540, 570, 600, 630, 660, 690, 720, 750, 780, 810, 840, 870, 900, 930, 960, 990, 1020, 1050, 1080, 1110, 1140, 1170, 1200, 1230, 1260, 1290, 1320, 1350, 1380, 1410, 1440],
        values: {
          0: '12:00am',
          30: '12:30am',
          60: '1:00am',
          90: '1:30am',
          120: '2:00am',
          150: '2:30am',
          180: '3:00am',
          210: '3:30am',
          240: '4:00am',
          270: '4:30am',
          300: '5:00am',
          330: '5:30am',
          360: '6:00am',
          390: '6:30am',
          420: '7:00am',
          450: '7:30am',
          480: '8:00am',
          510: '8:30am',
          540: '9:00am',
          570: '9:30am',
          600: '10:00am',
          630: '10:30am',
          660: '11:00am',
          690: '11:30am',
          720: '12:00pm',
          750: '12:30pm',
          780: '1:00pm',
          810: '1:30pm',
          840: '2:00pm',
          870: '2:30pm',
          900: '3:00pm',
          930: '3:30pm',
          960: '4:00pm',
          990: '4:30pm',
          1020: '5:00pm',
          1050: '5:30pm',
          1080: '6:00pm',
          1110: '6:30pm',
          1140: '7:00pm',
          1170: '7:30pm',
          1200: '8:00pm',
          1230: '8:30pm',
          1260: '9:00pm',
          1290: '9:30pm',
          1320: '10:00pm',
          1350: '10:30pm',
          1380: '11:00pm',
          1410: '11:30pm',
          1440: '12:00am'
        }
      },
      themeOptions: [{
        value: 'woc',
        label: 'Modern Colors'
      }, {
        value: 'bow',
        label: 'Classic B&W'
      }, {
        value: 'gow',
        label: 'Classic Greyscale'
      }, {
        value: 'boc',
        label: 'Black Text & Colors'
      }],
      classDetailsOptions: [{
        value: 'NPL',
        label: 'Number, Professor, Location'
      }, {
        value: 'LPN',
        label: 'Location, Professor, Number'
      }, {
        value: 'LNP',
        label: 'Location, Number, Professor'
      }]
    },
    colors:
      [
        '#7BA270',
        '#85B4C2',
        '#CD9161',
        '#74B79F',
        '#AA9E5B',
        '#769E9F',
        '#9D987A',
        '#658B76',
        '#92838F',
        '#A9ABC3',
        '#7C7FA4',
        '#CD6167',
        '#61CDC7',
        '#61CD91',
        '#9DCD61',
        '#619DCD'
      ]
  }
})
