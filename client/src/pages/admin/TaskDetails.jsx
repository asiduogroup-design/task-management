import ModulePage from '../shared/ModulePage.jsx';

const TaskDetails = ({ employeeView = false }) => (
  <ModulePage title={employeeView ? 'My Task Details' : 'Task Details'} />
);

export default TaskDetails;
